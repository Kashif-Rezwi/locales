import { Injectable, Logger, BadRequestException, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JobSubmitDto, PipelineEvent } from './pipeline.types';
import { GithubService } from '../github/github.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { AdapterRegistryService } from '../adapters/adapter-registry.service';
import { TranslationEngineService } from '../translation-engine/translation-engine.service';
import { CodeModService } from '../code-mod/code-mod.service';
import { RuntimeGeneratorService } from '../code-mod/runtime-generator.service';
import { GitDeliveryService } from '../git-delivery/git-delivery.service';
import { ReplaySubject, Observable } from 'rxjs';
import { ModifiedFile } from '../adapters/adapter.types';

const prisma = new PrismaClient();

@Injectable()
export class PipelineService implements OnModuleDestroy {
    private readonly logger = new Logger(PipelineService.name);

    // Stores active SSE streams per job ID
    private readonly streams = new Map<string, ReplaySubject<PipelineEvent>>();

    constructor(
        private readonly github: GithubService,
        private readonly workspace: WorkspaceService,
        private readonly adapters: AdapterRegistryService,
        private readonly translationEngine: TranslationEngineService,
        private readonly codeMod: CodeModService,
        private readonly runtimeGen: RuntimeGeneratorService,
        private readonly gitDelivery: GitDeliveryService,
    ) {
        // Start heartbeat interval to keep SSE connections alive
        setInterval(() => this.broadcastHeartbeats(), 30000);
    }

    onModuleDestroy() {
        prisma.$disconnect();
        for (const sub of this.streams.values()) {
            sub.complete();
        }
    }

    async listJobs(userId: string) {
        return prisma.job.findMany({
            where: { project: { userId } },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }

    async getJob(userId: string, id: string) {
        const job = await prisma.job.findFirst({ where: { id, project: { userId } } });
        if (!job) throw new BadRequestException('Job not found');
        return job;
    }

    streamEvents(jobId: string): Observable<any> {
        const defaultStream = new ReplaySubject<PipelineEvent>(1);
        const existingStream = this.streams.get(jobId);

        if (existingStream) {
            return existingStream.asObservable();
        }

        defaultStream.next({
            type: 'log',
            data: { message: 'Stream attached. Checking job state...', timestamp: new Date().toISOString() }
        });

        prisma.job.findUnique({ where: { id: jobId } }).then(job => {
            if (!job) {
                defaultStream.next({ type: 'error', data: { message: 'Job not found', timestamp: new Date().toISOString() } });
            } else if (job.status === 'completed' || job.status === 'failed') {
                defaultStream.next({ type: 'complete', data: { message: `Job already ${job.status}`, timestamp: new Date().toISOString(), metadata: job.metadata } });
            }
        });

        return defaultStream.asObservable();
    }

    async createJob(userId: string, dto: JobSubmitDto) {
        let project = await prisma.project.findFirst({
            where: { userId, githubOwner: dto.owner, githubRepo: dto.repo }
        });

        if (!project) {
            project = await prisma.project.create({
                data: {
                    userId,
                    repoUrl: `https://github.com/${dto.owner}/${dto.repo}`,
                    githubOwner: dto.owner,
                    githubRepo: dto.repo,
                    defaultBranch: dto.branch || 'main',
                    targetLocales: dto.targetLocales
                }
            });
        }

        // Rate limit: max 3 running/pending
        const activeCount = await prisma.job.count({
            where: { project: { userId }, status: { in: ['pending', 'running'] } }
        });
        if (activeCount >= 3) {
            throw new BadRequestException('You already have 3 jobs running. Please wait for one to finish.');
        }

        return prisma.job.create({
            data: {
                projectId: project.id,
                sourceBranch: dto.branch || project.defaultBranch,
                status: 'pending',
                locales: dto.targetLocales,
            }
        });
    }

    async runJob(userId: string, jobId: string) {
        const job = await prisma.job.findUnique({ where: { id: jobId }, include: { project: true } });
        if (!job || !job.project) return;

        // Init SSE stream
        const subject = new ReplaySubject<PipelineEvent>(1000); // Buffer up to 1000 events
        this.streams.set(jobId, subject);

        const emit = (type: PipelineEvent['type'], message: string, step?: string, level: 'info' | 'warn' | 'error' = 'info', meta?: any) => {
            subject.next({
                type,
                data: { message, step, level, timestamp: new Date().toISOString(), metadata: meta }
            });
            if (level === 'error') this.logger.error(`[${jobId}] ${message}`);
            else this.logger.log(`[${jobId}] ${message}`);
        };

        let workspaceHandle;
        const startTime = Date.now();
        const locales = job.locales;

        try {
            emit('step-change', 'Initializing', 'Initialization');
            await prisma.job.update({ where: { id: jobId }, data: { status: 'running' } });

            // 1. Permission check & Mode determination
            emit('progress', 'Verifying GitHub permissions...');
            const perms = await this.github.checkPermissions(job.project.githubOwner, job.project.githubRepo, userId);
            const accessMode = perms.push ? 'direct' : 'fork';
            emit('log', `Access mode selected: ${accessMode.toUpperCase()}`);

            let defaultBranch = job.sourceBranch;
            if (!defaultBranch) {
                defaultBranch = await this.github.getDefaultBranch(job.project.githubOwner, job.project.githubRepo, userId);
            }

            // 2. Trigger fork if needed
            if (accessMode === 'fork') {
                emit('progress', 'Forking repository to your account...');
                await this.github.forkRepo(job.project.githubOwner, job.project.githubRepo, userId);
            }

            // 3. Workspace creation
            emit('step-change', 'Cloning Repository', 'Workspace');
            const repoUrl = `https://github.com/${job.project.githubOwner}/${job.project.githubRepo}.git`;
            workspaceHandle = await this.workspace.create();
            await this.workspace.clone(workspaceHandle, repoUrl, defaultBranch);
            emit('log', `Workspace created: ${workspaceHandle.id}`);

            // 4. Framework Detection
            emit('step-change', 'Analyzing Project Structure', 'Detection');
            const allFiles = await this.workspace.listFiles(workspaceHandle, '**/*');

            const pkgJsonStr = await this.workspace.readFile(workspaceHandle, 'package.json');
            let deps = {};
            if (pkgJsonStr) {
                try {
                    const parsed = JSON.parse(pkgJsonStr);
                    deps = { ...parsed.dependencies, ...parsed.devDependencies };
                } catch { }
            }

            const detectResult = this.adapters.detect(deps, allFiles);
            const adapter = this.adapters.getByName(detectResult.name);
            emit('log', `Framework detected: ${adapter.name}`);

            // 5. String Extraction
            emit('step-change', 'Extracting Text Strings', 'Extraction');
            const sourceStrings = await adapter.extractStrings(
                allFiles,
                async (path) => (await this.workspace.readFile(workspaceHandle!, path)) || ''
            );
            emit('log', `Found ${sourceStrings.length} translatable strings.`);

            if (sourceStrings.length === 0) {
                emit('log', 'No user-facing strings needed translation.', undefined, 'warn');
                throw new Error('Zero translatable strings found in standard source files.');
            }

            // 6. Change Detection (Skip duplicates)
            const existingDbStrings = await prisma.sourceString.findMany({
                where: { project: { id: job.project.id }, hash: { in: sourceStrings.map(s => s.hash) } }
            });
            const dbHashSet = new Set(existingDbStrings.map(s => s.hash));
            const newStrings = sourceStrings.filter(s => !dbHashSet.has(s.hash));
            emit('progress', `Analyzed diff. ${newStrings.length} strings are new to this repo.`);

            // 7. Translation Engine
            emit('step-change', `Translating to ${locales.length} languages`, 'Translation');
            const inputs = sourceStrings.map(s => ({ text: s.sourceText, hash: s.hash }));

            let totalHits = 0, totalMisses = 0, totalCost = 0;
            const localeMaps = new Map<string, Map<string, string>>();

            for (const locale of locales) {
                emit('progress', `Translating to ${locale}...`);
                const { results, metrics } = await this.translationEngine.translateBatch(inputs, job.project.defaultLocale, locale, userId);
                totalHits += metrics.tmHits;
                totalMisses += metrics.tmMisses;
                totalCost += metrics.estimatedCostUsd;

                const dict = new Map<string, string>();
                for (const res of results) {
                    if (res.translatedText) dict.set(res.hash, res.translatedText);
                }
                localeMaps.set(locale, dict);
            }
            emit('log', `Translation complete. TM Hits: ${totalHits}, Misses: ${totalMisses}, Cost: $${totalCost.toFixed(4)}`);

            // 8. Babel Code Mod
            emit('step-change', 'Transforming Source Code', 'Code Mod');
            const uniqueSourcePaths = Array.from(new Set(sourceStrings.map(s => s.filePath)));
            const modifiedFilesInput: ModifiedFile[] = [];
            for (const p of uniqueSourcePaths) {
                const content = await this.workspace.readFile(workspaceHandle, p);
                if (content) modifiedFilesInput.push({ filePath: p, content });
            }

            const modifiedFiles = await adapter.applyCodeMod(modifiedFilesInput, sourceStrings);
            emit('log', `Applied modifications to ${modifiedFiles.length} files.`);

            // 9. Runtime & 10. Routing Generation
            emit('step-change', 'Generating Runtime Files', 'Generation');
            const generatedFiles = [];

            const entryPoint = adapter.getEntryPoint(allFiles) || 'src/index.tsx';
            const runtimeConfig = { defaultLocale: job.project.defaultLocale, entryPoint };

            generatedFiles.push(...adapter.generateRuntime(runtimeConfig, locales));
            generatedFiles.push(...adapter.generateRouting(locales));

            for (const locale of locales) {
                generatedFiles.push(this.runtimeGen.generateLocaleJson(sourceStrings, localeMaps.get(locale) || new Map(), locale));
            }

            const uniqueGeneratedFiles = Array.from(new Map(generatedFiles.map(f => [f.filePath, f])).values());
            emit('log', `Created ${uniqueGeneratedFiles.length} framework config files & translation dictionaries.`);

            // 11. Git Delivery
            emit('step-change', 'Deploying to GitHub', 'Delivery');
            if (accessMode === 'fork') {
                emit('progress', 'Waiting for fork to be ready on GitHub...');
                let ready = false;
                const userProfile = await this.github.getProfile(userId);
                for (let i = 0; i < 6; i++) { // max 30s
                    try {
                        await this.github.getLatestCommitSha(userId, userProfile.login, job.project.githubRepo, defaultBranch);
                        ready = true;
                        break;
                    } catch (e) {
                        await new Promise(r => setTimeout(r, 5000));
                    }
                }
                if (!ready) throw new Error('Fork provisioning timed out on GitHub.');
            }

            const allOutputFiles = [...modifiedFiles, ...uniqueGeneratedFiles];
            const deliveryResult = await this.gitDelivery.deliver(userId, {
                owner: job.project.githubOwner,
                repo: job.project.githubRepo,
                accessMode,
                defaultBranch,
                files: allOutputFiles,
                locales,
                stats: {
                    stringCount: sourceStrings.length,
                    hitRate: totalHits / (totalHits + totalMisses || 1),
                    estimatedCostUsd: totalCost
                }
            });
            emit('log', `Successfully pushed to branch: ${deliveryResult.branchName}`);
            emit('log', `Pull Request opened: ${deliveryResult.prUrl}`);

            // 12. Finalize
            emit('step-change', 'Finalizing', 'Finalize');
            const metadata = {
                stringCount: sourceStrings.length,
                tmHits: totalHits,
                tmHitRate: (totalHits / (totalHits + totalMisses || 1) * 100).toFixed(1) + '%',
                estimatedCostUsd: totalCost,
                prUrl: deliveryResult.prUrl,
                durationMs: Date.now() - startTime
            };

            await prisma.job.update({
                where: { id: jobId },
                data: { status: 'completed', metadata: JSON.stringify(metadata) }
            });

            // Async persist source strings to speed up next run
            if (newStrings.length > 0) {
                prisma.sourceString.createMany({
                    data: newStrings.map(s => ({
                        hash: s.hash,
                        sourceText: s.sourceText,
                        filePath: s.filePath,
                        nodeType: s.nodeType,
                        context: s.context ?? '',
                        projectId: job.project.id
                    })),
                    skipDuplicates: true
                }).catch(e => this.logger.error('Failed to save source strings', e));
            }

            emit('complete', 'Delivery pipeline completed successfully.', undefined, 'info', metadata);
        } catch (error: any) {
            let msg = error instanceof Error ? error.message : 'Unknown pipeline error';
            if (msg.includes('rate limit')) msg = 'GitHub Rate Limit exceeded. Please try again later.';

            emit('error', `Pipeline failed: ${msg}`, undefined, 'error');
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'failed',
                    error: msg,
                    metadata: JSON.stringify({ error: msg, durationMs: Date.now() - startTime })
                }
            });
            subject.complete(); // close stream tightly on error
        } finally {
            if (workspaceHandle) {
                this.workspace.destroy(workspaceHandle).catch(e => this.logger.warn(`Failed to cleanup workspace ${workspaceHandle!.id}`));
            }
            // Leave the stream open for a short grace period so last messages can flush to late SSE clients
            setTimeout(() => {
                subject.complete();
                this.streams.delete(jobId);
            }, 10000);
        }
    }

    private broadcastHeartbeats() {
        for (const subject of this.streams.values()) {
            subject.next({ type: 'heartbeat', data: { message: 'ping', timestamp: new Date().toISOString() } });
        }
    }
}
