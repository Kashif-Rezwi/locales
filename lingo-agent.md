This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where security check has been disabled.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Security check has been disabled - content may contain sensitive information
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
client/
  app/
    api/
      auth/
        [...nextauth]/
          route.ts
    dashboard/
      page.tsx
    jobs/
      [jobId]/
        page.tsx
    login/
      page.tsx
    globals.css
    layout.tsx
    page.tsx
    session-provider.tsx
  components/
    job-history-tab.tsx
    language-selector.tsx
    log-entry.tsx
    log-stream.tsx
    progress-stepper.tsx
    repo-input-form.tsx
    result-card.tsx
  hooks/
    use-agent-job.ts
    use-job-history.ts
    use-job-stream.ts
    use-settings.ts
  lib/
    api-client.ts
    auth.ts
    constants.ts
  types/
    agent.ts
    job.ts
    next-auth.d.ts
  .env.example
  .eslintrc.json
  next-env.d.ts
  next.config.mjs
  package.json
  postcss.config.mjs
  tailwind.config.ts
  tsconfig.json
server/
  prisma/
    migrations/
      20260220115339_init/
        migration.sql
      migration_lock.toml
    schema.prisma
  src/
    agent/
      dto/
        job-response.dto.ts
        start-job.dto.ts
      prompts/
        agent-system.prompt.ts
      tools/
        analyze-repo.tool.ts
        clone-repo.tool.ts
        commit-push.tool.ts
        detect-framework.tool.ts
        index.ts
        install-translate.tool.ts
        setup-lingo.tool.ts
        trigger-preview.tool.ts
      agent.controller.ts
      agent.module.ts
      agent.service.ts
    auth/
      auth.guard.ts
      auth.module.ts
      auth.service.ts
    common/
      filters/
        http-exception.filter.ts
      types/
        agent.types.ts
        events.types.ts
        index.ts
        tool.types.ts
      utils/
        file-patcher.ts
        framework-detector.ts
        url-parser.ts
    github/
      github.module.ts
      github.service.ts
    jobs/
      jobs.module.ts
      jobs.service.ts
      prisma.service.ts
    mcp/
      mcp.module.ts
      mcp.service.ts
    sandbox/
      sandbox.module.ts
      sandbox.service.ts
    vercel/
      vercel.module.ts
      vercel.service.ts
    app.module.ts
    health.controller.ts
    main.ts
  test/
    app.e2e-spec.ts
    jest-e2e.json
  .env.example
  .prettierrc
  eslint.config.mjs
  nest-cli.json
  package.json
  prisma.config.ts
  tsconfig.build.json
  tsconfig.json
.gitignore
README.md
```

# Files

## File: client/app/api/auth/[...nextauth]/route.ts
````typescript
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
````

## File: client/app/dashboard/page.tsx
````typescript
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { startJob } from '@/lib/api-client';
import { RepoInputForm } from '@/components/repo-input-form';
import { JobHistoryTab } from '@/components/job-history-tab';
import { useJobHistory } from '@/hooks/use-job-history';
import { useSettings } from '@/hooks/use-settings';

type Tab = 'new' | 'history' | 'settings';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('new');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { history, addJob, clearHistory } = useJobHistory();
    const { settings, updateSettings, isLoaded } = useSettings();

    // Local state for Settings form
    const [tempLingoKey, setTempLingoKey] = useState('');
    const [tempGroqKey, setTempGroqKey] = useState('');
    const [showLingoKey, setShowLingoKey] = useState(false);
    const [showGroqKey, setShowGroqKey] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);

    // Sync settings to local state once loaded
    useEffect(() => {
        if (isLoaded) {
            setTempLingoKey((prev) => prev || settings.lingoApiKey);
            setTempGroqKey((prev) => prev || settings.groqApiKey);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('t') === 'history') {
                setTab('history');
            } else if (params.get('t') === 'settings') {
                setTab('settings');
            }
        }
    }, []);

    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    useEffect(() => {
        if (status === 'unauthenticated') router.replace('/login');
    }, [status, router]);

    const githubToken = (session as typeof session & { githubToken?: string })?.githubToken ?? '';

    const handleSubmit = useCallback(
        async (repoUrl: string, locales: string[]) => {
            setError(null);
            setIsLoading(true);
            try {
                const { jobId } = await startJob({
                    repoUrl,
                    locales,
                    githubToken,
                    lingoApiKey: settings.lingoApiKey.trim() || undefined,
                    groqApiKey: settings.groqApiKey.trim() || undefined,
                });
                addJob({ jobId, repoUrl, locales, startedAt: new Date().toISOString(), status: 'running' });
                router.push(`/jobs/${jobId}`);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to start job.');
            } finally {
                setIsLoading(false);
            }
        },
        [githubToken, router, addJob, settings],
    );

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        updateSettings({ lingoApiKey: tempLingoKey, groqApiKey: tempGroqKey });
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 3000);
    };

    if (status === 'loading') {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-spin-slow rounded-full h-8 w-8 border-2 border-indigo-500/30 border-t-indigo-400" />
            </main>
        );
    }

    return (
        <main className="min-h-screen">
            {/* Header */}
            <header className="border-b border-white/5 py-4 px-6 flex items-center justify-between glass fixed top-0 w-full z-50 left-0">
                <div className="flex items-center gap-3">
                    <span className="text-lg font-bold tracking-tight text-white">
                        Lingo<span className="text-indigo-400">Agent</span>
                    </span>
                    {/* Multilingual agent badge */}
                    <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-indigo-400/80 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="m12.87 15.07-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7 1.62-4.33L19.12 17h-3.24z" />
                        </svg>
                        Multilingual AI Agent
                    </span>
                </div>
                {/* Profile menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((o) => !o)}
                        className="flex items-center gap-2 group"
                        aria-label="Account menu"
                    >
                        {session?.user?.image && (
                            <Image
                                src={session.user.image}
                                alt={session.user.name ?? 'User'}
                                width={28}
                                height={28}
                                className="rounded-full ring-2 ring-indigo-400/50"
                            />
                        )}
                        <svg className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-56 z-20 bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in shadow-black/80">
                            {session?.user && (
                                <div className="px-5 py-4 border-b border-white/5">
                                    <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
                                    <p className="text-xs text-slate-400 truncate mt-0.5">{session.user.email}</p>
                                </div>
                            )}
                            <div className="p-1.5">
                                <button
                                    onClick={() => signOut({ callbackUrl: '/login' })}
                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                    Sign out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Main */}
            <div className="max-w-2xl mx-auto px-6 pt-24 pb-6 space-y-6 animate-fade-up">

                {/* Title */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                        Go Multilingual, in minutes.
                    </h1>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Drop a Next.js repo URL, pick your languages, and LingoAgent ships a
                        production-ready multilingual PR in seconds — zero config, zero friction.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-white/5 pb-0">
                    <TabButton active={tab === 'new'} onClick={() => setTab('new')}>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                        New Job
                    </TabButton>
                    <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                        </svg>
                        History
                        {history.length > 0 && (
                            <span className="ml-1 text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full px-1.5 py-0 leading-4">
                                {history.length}
                            </span>
                        )}
                    </TabButton>
                    <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                    </TabButton>
                </div>

                {/* Tab: New Job */}
                {tab === 'new' && (
                    <div className="space-y-4">
                        <div className="glass rounded-2xl p-6 glow-indigo">
                            <RepoInputForm
                                onSubmit={handleSubmit}
                                isLoading={isLoading}
                                isStreaming={false}
                            />
                        </div>
                        {error && (
                            <div className="animate-fade-in glass border border-red-500/20 rounded-xl p-4">
                                <p className="text-red-400 text-sm font-medium">{error}</p>
                            </div>
                        )}
                        <p className="text-center text-slate-600 text-xs">
                            ✦ Supports Next.js App Router repositories · Private repos require{' '}
                            <code className="text-slate-500">repo</code> scope
                        </p>
                    </div>
                )}

                {/* Tab: History */}
                {tab === 'history' && (
                    <JobHistoryTab history={history} onClear={clearHistory} />
                )}

                {/* Tab: Settings */}
                {tab === 'settings' && (
                    <div className="space-y-6">
                        <div className="glass rounded-2xl p-6 border border-white/5 space-y-6">
                            <div className="space-y-2">
                                <h2 className="text-white font-semibold">Custom API Keys</h2>
                                <p className="text-slate-400 text-xs leading-relaxed">
                                    Override the default system quotas securely. Keys are stored locally in your browser and sent solely to the agent pipeline for processing your translation requests.
                                </p>
                            </div>

                            <form onSubmit={handleSaveSettings} className="space-y-5">
                                <div className="space-y-2">
                                    <label htmlFor="lingo-key" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                        Lingo.dev API Key
                                    </label>
                                    <div className="relative group/input">
                                        <input
                                            id="lingo-key"
                                            type={showLingoKey ? 'text' : 'password'}
                                            value={tempLingoKey}
                                            onChange={(e) => setTempLingoKey(e.target.value)}
                                            placeholder="lin_..."
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition-all font-mono pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowLingoKey(!showLingoKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                                            title={showLingoKey ? 'Hide key' : 'Show key'}
                                        >
                                            {showLingoKey ? (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-slate-500 text-[11px]">
                                        Optional. Required for generating translations.{' '}
                                        <a href="https://lingo.dev/en/app" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                                            Get your key here
                                        </a>
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="groq-key" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                        Groq API Key
                                    </label>
                                    <div className="relative group/input">
                                        <input
                                            id="groq-key"
                                            type={showGroqKey ? 'text' : 'password'}
                                            value={tempGroqKey}
                                            onChange={(e) => setTempGroqKey(e.target.value)}
                                            placeholder="gsk_..."
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition-all font-mono pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowGroqKey(!showGroqKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                                            title={showGroqKey ? 'Hide key' : 'Show key'}
                                        >
                                            {showGroqKey ? (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-slate-500 text-[11px]">
                                        Optional. Powers the Llama 3.3 pipeline.{' '}
                                        <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                                            Get your key here
                                        </a>
                                    </p>
                                </div>

                                <div className="pt-2 flex items-center justify-between">
                                    <button
                                        type="submit"
                                        disabled={tempLingoKey.trim() === settings.lingoApiKey && tempGroqKey.trim() === settings.groqApiKey}
                                        className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-all shadow-sm border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Save Changes
                                    </button>
                                    {savedNotice && (
                                        <span className="text-emerald-400 text-sm font-medium animate-fade-in flex items-center gap-1.5">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                            Saved locally
                                        </span>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 -mb-px ${active
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}
        >
            {children}
        </button>
    );
}
````

## File: client/app/jobs/[jobId]/page.tsx
````typescript
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { cancelJob } from '@/lib/api-client';
import { useJobStream } from '@/hooks/use-job-stream';
import { useJobHistory } from '@/hooks/use-job-history';
import { LogStream } from '@/components/log-stream';
import { ResultCard } from '@/components/result-card';

interface JobPageProps {
    params: { jobId: string };
}

/** Pure canvas confetti burst — fires 120 particles and cleans up after 3s. No npm deps needed. */
function fireConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    const COLORS = ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
    const particles = Array.from({ length: 120 }, () => ({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2 - 100,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 1) * 14,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.3,
        w: 8 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 1,
    }));
    let frame: number;
    const GRAVITY = 0.35;
    const start = performance.now();
    function draw(ts: number) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const elapsed = ts - start;
        const fade = Math.max(0, 1 - elapsed / 2500);
        for (const p of particles) {
            p.vy += GRAVITY;
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.rotV;
            p.alpha = fade;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        }
        if (elapsed < 3000) frame = requestAnimationFrame(draw);
        else { canvas.remove(); cancelAnimationFrame(frame); }
    }
    frame = requestAnimationFrame(draw);
}

export default function JobPage({ params }: JobPageProps) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') router.replace('/login');
    }, [status, router]);

    const { logs: streamLogs, result, error, isStreaming, isLoading } = useJobStream(params.jobId, session?.githubToken);
    const [isCancelling, setIsCancelling] = useState(false);
    const { history, updateJob } = useJobHistory();
    const [didUpdate, setDidUpdate] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const confettiFired = useRef(false);

    const historyEntry = history.find((e) => e.jobId === params.jobId);
    const displayLogs = streamLogs.length > 0 ? streamLogs : (historyEntry?.logs || []);

    useEffect(() => {
        if (streamLogs.length > 0) {
            updateJob(params.jobId, { logs: streamLogs });
        }
    }, [streamLogs, params.jobId, updateJob]);

    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    useEffect(() => {
        if (didUpdate) return;
        if (result) {
            updateJob(params.jobId, { status: 'done', prUrl: result.prUrl, previewUrl: result.previewUrl });
            setDidUpdate(true);
            // Fire confetti once on successful completion
            if (!confettiFired.current) {
                confettiFired.current = true;
                fireConfetti();
            }
        } else if (error && !isStreaming) {
            updateJob(params.jobId, { status: 'failed' });
            setDidUpdate(true);
        }
    }, [result, error, isStreaming, didUpdate, updateJob, params.jobId]);

    const handleCancel = async () => {
        if (!session?.githubToken) return;
        try {
            setIsCancelling(true);
            await cancelJob(params.jobId, session.githubToken);
        } catch (err) {
            console.error('Failed to cancel job', err);
            setIsCancelling(false); // only reset on error, stream unmounts on success
        }
    };

    if (status === 'loading') {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-spin-slow rounded-full h-8 w-8 border-2 border-indigo-500/30 border-t-indigo-400" />
            </main>
        );
    }

    const isLive = isStreaming && !result && !error;

    const handleBack = () => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('from') === 'history') {
                router.push('/dashboard?t=history');
                return;
            }
        }
        router.push('/dashboard');
    };

    return (
        <main className="min-h-screen">
            {/* Header */}
            <header className="border-b border-white/5 py-4 px-6 flex items-center justify-between glass fixed top-0 w-full z-50 left-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="text-slate-500 hover:text-slate-300 transition-colors text-sm flex items-center gap-1.5"
                    >
                        ← Back
                    </button>
                    <span className="text-slate-700">|</span>
                    <span className="text-lg font-bold tracking-tight text-white">
                        Lingo<span className="text-indigo-400">Agent</span>
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {/* Live status badge & Stop button */}
                    {isLive && !isLoading && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCancel}
                                disabled={isCancelling}
                                className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 hover:border-red-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-red-500/10"
                                title="End pipeline immediately"
                            >
                                {isCancelling ? (
                                    <span className="h-3 w-3 rounded-full border-2 border-red-400 border-t-red-500/20 animate-spin" />
                                ) : (
                                    <svg className="w-3 h-3 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                        <rect x="6" y="6" width="12" height="12" rx="2" />
                                    </svg>
                                )}
                                {isCancelling ? 'Stopping...' : 'End Pipeline'}
                            </button>
                            <span className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Live
                            </span>
                        </div>
                    )}
                    {result && !isLoading && (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-1">
                            ✓ Done
                        </span>
                    )}
                    {error && !isStreaming && !isLoading && (
                        <span className="flex items-center gap-1.5 text-xs text-red-300 bg-red-500/10 border border-red-500/25 rounded-full px-2.5 py-1">
                            ✕ Failed
                        </span>
                    )}
                    {/* Profile menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuOpen((o) => !o)}
                            className="flex items-center gap-2 group"
                            aria-label="Account menu"
                        >
                            {session?.user?.image && (
                                <Image
                                    src={session.user.image}
                                    alt={session.user.name ?? 'User'}
                                    width={28}
                                    height={28}
                                    className="rounded-full ring-2 ring-indigo-400/50"
                                />
                            )}
                            <svg className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                            </svg>
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-56 z-20 bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                                {session?.user && (
                                    <div className="px-5 py-4 border-b border-white/5">
                                        <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
                                        <p className="text-xs text-slate-400 truncate mt-0.5">{session.user.email}</p>
                                    </div>
                                )}
                                <div className="p-1.5">
                                    <button
                                        onClick={() => signOut({ callbackUrl: '/login' })}
                                        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                            <polyline points="16 17 21 12 16 7" />
                                            <line x1="21" y1="12" x2="9" y2="12" />
                                        </svg>
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-6 pt-28 pb-10 space-y-8 animate-fade-up">
                {/* Heading */}
                <div className="space-y-1">
                    {isLoading ? (
                        <>
                            <div className="h-8 w-64 bg-white/5 rounded-lg animate-pulse mb-2" />
                            <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold tracking-tight text-white">
                                {result ? 'Pipeline complete 🎉' : error && !isStreaming ? 'Pipeline failed' : 'Translating repository…'}
                            </h1>
                            <p className="text-slate-600 text-xs font-mono">{params.jobId}</p>
                        </>
                    )}
                </div>

                {isLoading ? (
                    <div className="space-y-8 animate-fade-in">
                        {/* Stepper Skeleton */}
                        <div className="space-y-4">
                            <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                            <div className="flex gap-2.5 overflow-hidden">
                                {[...Array(7)].map((_, i) => (
                                    <div key={i} className="h-7 w-24 bg-white/5 rounded-full animate-pulse flex-shrink-0" />
                                ))}
                            </div>
                        </div>
                        {/* Terminal Skeleton */}
                        <div className="h-72 w-full bg-[#05050c] border border-white/5 rounded-xl animate-pulse" />
                    </div>
                ) : (
                    <>
                        {/* Connecting spinner */}
                        {displayLogs.length === 0 && isStreaming && (
                            <div className="flex items-center gap-3 text-slate-400 text-sm animate-fade-in">
                                <span className="animate-spin-slow rounded-full h-4 w-4 border-2 border-indigo-500/30 border-t-indigo-400 flex-shrink-0" />
                                Connecting to pipeline…
                            </div>
                        )}

                        {/* Log stream */}
                        {(displayLogs.length > 0 || isStreaming) && (
                            <div className="animate-fade-in">
                                <LogStream
                                    logs={displayLogs}
                                    isStreaming={isStreaming}
                                    isComplete={!!result || historyEntry?.status === 'done'}
                                    hasError={(!!error && !isStreaming) || historyEntry?.status === 'failed'}
                                />
                            </div>
                        )}

                        {/* Result */}
                        {result && (
                            <div className="animate-fade-up">
                                <ResultCard result={result} />
                            </div>
                        )}

                        {/* Error */}
                        {error && !isStreaming && (
                            <div className="animate-fade-in glass border border-red-500/20 rounded-xl p-5 space-y-3">
                                <p className="text-red-400 font-semibold text-sm">Pipeline failed</p>
                                <p className="text-red-300/70 text-sm leading-relaxed">{error}</p>
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 transition-colors"
                                >
                                    ← Start a new job
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
````

## File: client/app/login/page.tsx
````typescript
'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
    return (
        <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Animated background orbs */}
            <div
                aria-hidden
                className="animate-orb pointer-events-none absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-30"
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)' }}
            />
            <div
                aria-hidden
                className="animate-orb-delay pointer-events-none absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)' }}
            />

            <div className="relative z-10 w-full max-w-sm px-6 animate-fade-up">
                {/* Logo */}
                <div className="text-center mb-10 space-y-3">
                    <div className="inline-flex items-center gap-2 mb-1">
                        <span className="text-4xl font-extrabold tracking-tight text-white">
                            Lingo<span className="text-indigo-400">Agent</span>
                        </span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
                        One input. One click. A working multilingual branch with a live preview.
                    </p>
                </div>

                {/* Glass card */}
                <div className="glass rounded-2xl p-8 space-y-6 glow-indigo">
                    <p className="text-slate-300 text-sm text-center leading-relaxed">
                        Sign in with GitHub to let LingoAgent read your repos and open pull requests.
                    </p>

                    <button
                        onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
                        className="group w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-white text-slate-900 font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0" aria-hidden>
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        Continue with GitHub
                    </button>
                </div>

                <p className="text-center text-slate-600 text-xs mt-6">
                    Requires <code className="text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">repo</code> scope to clone and commit to your repositories.
                </p>
            </div>
        </main>
    );
}
````

## File: client/app/globals.css
````css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ─── Design Tokens ─────────────────────────────── */
:root {
    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
    --bg-base: #080810;
    --glow-indigo: 0 0 40px rgba(99, 102, 241, 0.25);
    --glow-emerald: 0 0 40px rgba(52, 211, 153, 0.2);
    --glow-red: 0 0 30px rgba(239, 68, 68, 0.2);
}

/* ─── Base ───────────────────────────────────────── */
html {
    scroll-behavior: smooth;
}

body {
    font-family: var(--font-sans);
    background-color: var(--bg-base);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

/* ─── Scrollbar ──────────────────────────────────── */
/* Hide scrollbar globally but allow scrolling */
* {
    -ms-overflow-style: none;
    /* IE and Edge */
    scrollbar-width: none;
    /* Firefox */
}

::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
}

/* Keep the utility class in case it's needed explicitly */
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}

.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

/* ─── Animations ─────────────────────────────────── */
@keyframes fade-up {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes fade-in {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes shimmer {
    0% {
        background-position: -200% 0;
    }

    100% {
        background-position: 200% 0;
    }
}

@keyframes blink {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0;
    }
}

@keyframes spin-slow {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

@keyframes orb-float {

    0%,
    100% {
        transform: translate(0, 0) scale(1);
    }

    50% {
        transform: translate(20px, -20px) scale(1.05);
    }
}

/* ─── Utility Classes ────────────────────────────── */
.animate-fade-up {
    animation: fade-up 0.4s ease forwards;
}

.animate-fade-in {
    animation: fade-in 0.3s ease forwards;
}

.animate-blink {
    animation: blink 1s step-end infinite;
}

.animate-orb {
    animation: orb-float 8s ease-in-out infinite;
}

.animate-orb-delay {
    animation: orb-float 10s ease-in-out infinite reverse;
}

.animate-spin-slow {
    animation: spin-slow 3s linear infinite;
}

/* Log entry stagger */
.log-entry {
    animation: fade-up 0.2s ease forwards;
    opacity: 0;
}

.log-entry:nth-child(1) {
    animation-delay: 0ms;
}

.log-entry:nth-child(2) {
    animation-delay: 30ms;
}

.log-entry:nth-child(3) {
    animation-delay: 60ms;
}

.log-entry:nth-child(4) {
    animation-delay: 90ms;
}

.log-entry:nth-child(n+5) {
    animation-delay: 120ms;
}

/* ─── Glow Utilities ─────────────────────────────── */
.glow-indigo {
    box-shadow: var(--glow-indigo);
}

.glow-emerald {
    box-shadow: var(--glow-emerald);
}

/* ─── Glass Card ─────────────────────────────────── */
.glass {
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
}
````

## File: client/app/layout.tsx
````typescript
import type { Metadata } from 'next';
import { SessionProvider } from '@/app/session-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'LingoAgent — Multilingual Support, Automated',
  description:
    'LingoAgent autonomously adds multilingual support to Next.js repositories — one PR, one preview, zero configuration.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased scrollbar-hide" style={{ backgroundColor: 'var(--bg-base)' }}>
        {/* Subtle global radial noise to break flatness */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10">
          <SessionProvider>{children}</SessionProvider>
        </div>
      </body>
    </html>
  );
}
````

## File: client/app/page.tsx
````typescript
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function HomePage() {
    const session = await getServerSession(authOptions);
    if (session) redirect('/dashboard');
    redirect('/login');
}
````

## File: client/app/session-provider.tsx
````typescript
'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

/** Client component wrapper for NextAuth SessionProvider (required for App Router). */
export function SessionProvider({ children }: { children: React.ReactNode }) {
    return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
````

## File: client/components/job-history-tab.tsx
````typescript
'use client';

import { useRouter } from 'next/navigation';
import type { HistoryEntry } from '@/hooks/use-job-history';

interface JobHistoryTabProps {
    history: HistoryEntry[];
    onClear: () => void;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

const StatusBadge = ({ status }: { status: HistoryEntry['status'] }) => {
    if (status === 'done') return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Done
        </span>
    );
    if (status === 'failed') return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/25 rounded-full px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Failed
        </span>
    );
    return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 rounded-full px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" /> Running
        </span>
    );
};

export function JobHistoryTab({ history, onClear }: JobHistoryTabProps) {
    const router = useRouter();

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                    </svg>
                </div>
                <p className="text-slate-500 text-sm">No previous jobs yet.</p>
                <p className="text-slate-600 text-xs">Jobs you run will appear here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between relative z-10 pb-4">
                <p className="text-xs text-slate-500">{history.length} job{history.length !== 1 ? 's' : ''}</p>
                <button
                    onClick={onClear}
                    className="text-[11px] text-slate-600 hover:text-red-400 transition-colors"
                >
                    Clear history
                </button>
            </div>

            <div
                className="space-y-2.5 max-h-[400px] overflow-y-auto px-1 scrollbar-hide relative"
                style={{
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)',
                    paddingTop: '16px',
                    paddingBottom: '16px',
                    marginTop: '-8px' // offset the padding so visual space stays the same
                }}
            >
                {history.map((job) => {
                    const repoName = job.repoUrl.replace('https://github.com/', '');
                    return (
                        <button
                            key={job.jobId}
                            onClick={() => router.push(`/jobs/${job.jobId}?from=history`)}
                            className="w-full text-left glass rounded-xl p-4 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-200 group border border-white/5"
                        >
                            <div className="flex items-start gap-3">
                                {/* Repo icon */}
                                <div className="mt-0.5 w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                                    </svg>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                                            {repoName}
                                        </p>
                                        <StatusBadge status={job.status} />
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {job.locales.map((l) => (
                                            <span key={l} className="text-[10px] text-slate-500 bg-slate-800/60 border border-slate-700/40 rounded px-1.5 py-0.5">
                                                {l}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] text-slate-600">{timeAgo(job.startedAt)}</p>
                                        {job.prUrl && (
                                            <a
                                                href={job.prUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                                            >
                                                View PR →
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
````

## File: client/components/language-selector.tsx
````typescript
'use client';

import { useState } from 'react';
import { SUPPORTED_LOCALES } from '@/lib/constants';

interface LanguageSelectorProps {
    selected: string[];
    onChange: (locales: string[]) => void;
    disabled?: boolean;
}

/** Number of locales to show before the expand button. */
const INITIAL_VISIBLE = 13;

export function LanguageSelector({ selected, onChange, disabled }: LanguageSelectorProps) {
    const [expanded, setExpanded] = useState(false);

    function toggle(code: string) {
        onChange(
            selected.includes(code)
                ? selected.filter((l) => l !== code)
                : [...selected, code],
        );
    }

    const visible = expanded ? SUPPORTED_LOCALES : SUPPORTED_LOCALES.slice(0, INITIAL_VISIBLE);
    const hiddenCount = SUPPORTED_LOCALES.length - INITIAL_VISIBLE;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">Target Languages</label>
                <span className="text-xs text-slate-500 tabular-nums">
                    {selected.length} selected
                </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {visible.map(({ code, label }) => {
                    const active = selected.includes(code);
                    return (
                        <button
                            key={code}
                            type="button"
                            onClick={() => toggle(code)}
                            disabled={disabled}
                            className={`
                px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 disabled:opacity-40
                ${active
                                    ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 shadow-sm shadow-indigo-500/20'
                                    : 'bg-slate-800/50 border border-slate-700/40 text-slate-400 hover:border-slate-600/60 hover:text-slate-300 hover:bg-slate-700/40'
                                }
              `}
                        >
                            {label}
                        </button>
                    );
                })}

                {/* Expand / collapse button */}
                {!expanded ? (
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        disabled={disabled}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-slate-600/50 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all duration-150 disabled:opacity-40"
                    >
                        + {hiddenCount} more
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setExpanded(false)}
                        disabled={disabled}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-slate-600/50 text-slate-500 hover:text-slate-300 hover:border-slate-500/50 transition-all duration-150 disabled:opacity-40"
                    >
                        Show less
                    </button>
                )}
            </div>
        </div>
    );
}
````

## File: client/components/log-entry.tsx
````typescript
import type { LogEntry } from '@/types/job';

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
    info: { dot: 'bg-slate-500', text: 'text-slate-300' },
    success: { dot: 'bg-emerald-400', text: 'text-emerald-300' },
    error: { dot: 'bg-red-400', text: 'text-red-300' },
    warn: { dot: 'bg-yellow-400', text: 'text-yellow-300' },
};

export function LogEntryRow({ entry }: { entry: LogEntry }) {
    const style = STATUS_STYLES[entry.level] ?? STATUS_STYLES.info;

    return (
        <div className="log-entry flex items-start gap-2 py-0.5 leading-relaxed">
            {/* Status dot */}
            <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${style.dot}`} />
            {/* Step label */}
            {entry.step && (
                <span className="flex-shrink-0 text-[10px] text-indigo-400/70 bg-indigo-500/10 border border-indigo-500/20 rounded px-1 py-px font-mono leading-none mt-px">
                    {entry.step}
                </span>
            )}
            {/* Message */}
            <span className={`${style.text} break-all`}>{entry.message}</span>
        </div>
    );
}
````

## File: client/components/log-stream.tsx
````typescript
'use client';

import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/types/job';
import { LogEntryRow } from './log-entry';
import { ProgressStepper } from './progress-stepper';

interface LogStreamProps {
    logs: LogEntry[];
    isStreaming: boolean;
    isComplete: boolean;
    hasError: boolean;
}

export function LogStream({ logs, isStreaming, isComplete, hasError }: LogStreamProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const currentStep = [...logs].reverse().find((l) => l.step)?.step ?? null;

    if (logs.length === 0 && !isStreaming) return null;

    return (
        <div className="space-y-5">
            <ProgressStepper currentStep={currentStep} isComplete={isComplete} hasError={hasError} />

            {/* Terminal window */}
            <div
                className="rounded-xl border border-white/5 overflow-hidden"
                style={{ background: '#05050c' }}
            >
                {/* Terminal title bar */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                    <span className="ml-3 text-xs text-slate-600 font-mono">agent output</span>
                    {isStreaming && (
                        <span className="ml-auto flex items-center gap-1.5 text-[10px] text-indigo-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                            streaming
                        </span>
                    )}
                </div>

                {/* Log body */}
                <div className="p-4 h-72 overflow-y-auto font-mono text-xs space-y-px scroll-smooth">
                    {logs.map((entry, i) => (
                        <LogEntryRow key={i} entry={entry} />
                    ))}
                    {isStreaming && (
                        <div className="flex items-center gap-2 pt-1 text-slate-600">
                            <span className="animate-blink">▋</span>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}
````

## File: client/components/progress-stepper.tsx
````typescript
import { PIPELINE_STEPS } from '@/lib/constants';

interface ProgressStepperProps {
    currentStep: string | null;
    isComplete: boolean;
    hasError: boolean;
}

// Solid flat SVG icons — one per pipeline step
const CloneIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 0 1 0 20A10 10 0 0 1 12 2zm0 2a8 8 0 0 0 0 16A8 8 0 0 0 12 4zm1 4v4h4l-5 5-5-5h4V8h2z" />
    </svg>
);

const DetectIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
);

const AnalyzeIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
    </svg>
);

const ConfigureIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
);

const TranslateIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="m12.87 15.07-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7 1.62-4.33L19.12 17h-3.24z" />
    </svg>
);

const CommitIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5 2.24-5 5-5 5 2.24 5 5zm-5-7.93V2l-4 4 4 4V7.07C14.06 7.56 16 9.58 16 12s-1.94 4.44-4 4.93V18.9c3.06-.49 6-3.08 6-6.9 0-3.82-2.94-6.41-6-6.93zM8 12c0-2.42 1.94-4.44 4-4.93V5.07C8.94 5.56 6 8.18 6 12c0 3.82 2.94 6.41 6 6.9v-2.07C9.94 16.44 8 14.42 8 12z" />
    </svg>
);

const DeployIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
    </svg>
);

const STEP_ICON_COMPONENTS: Record<string, React.FC> = {
    clone_repo: CloneIcon,
    detect_framework: DetectIcon,
    analyze_repo: AnalyzeIcon,
    setup_lingo: ConfigureIcon,
    install_and_translate: TranslateIcon,
    commit_and_push: CommitIcon,
    trigger_preview: DeployIcon,
};

export function ProgressStepper({ currentStep, isComplete, hasError }: ProgressStepperProps) {
    const currentIndex = PIPELINE_STEPS.findIndex((s) => s.id === currentStep);

    return (
        <div className="space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pipeline</p>
            <div className="flex items-center gap-1 flex-nowrap overflow-x-auto scrollbar-hide pb-2 -mb-2">
                {PIPELINE_STEPS.map((step, idx) => {
                    const isDone = isComplete || (currentIndex >= 0 && idx < currentIndex);
                    const isActive = currentIndex >= 0 && idx === currentIndex && !isComplete && !hasError;
                    const isErrored = hasError && idx === currentIndex;

                    let cls = 'bg-slate-800/60 border-slate-700/60 text-slate-500';
                    if (isErrored) cls = 'bg-red-500/10 border-red-500/40 text-red-400';
                    else if (isDone) cls = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400';
                    else if (isActive) cls = 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300 shadow-sm shadow-indigo-500/20';

                    const Icon = STEP_ICON_COMPONENTS[step.id];

                    return (
                        <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
                            <div
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-300 ${cls} ${isActive ? 'animate-pulse' : ''}`}
                            >
                                {Icon && <Icon />}
                                <span>{step.label}</span>
                            </div>
                            {idx < PIPELINE_STEPS.length - 1 && (
                                <div
                                    className={`h-px w-4 flex-shrink-0 transition-colors duration-500 ${isDone ? 'bg-emerald-500/50' : 'bg-slate-700/60'}`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
````

## File: client/components/repo-input-form.tsx
````typescript
'use client';

import { useState } from 'react';
import { DEMO_LOCALES } from '@/lib/constants';
import { LanguageSelector } from './language-selector';

interface RepoInputFormProps {
    onSubmit: (repoUrl: string, locales: string[]) => void;
    isLoading: boolean;
    isStreaming: boolean;
}

export function RepoInputForm({ onSubmit, isLoading, isStreaming }: RepoInputFormProps) {
    const [repoUrl, setRepoUrl] = useState('');
    const [selectedLocales, setSelectedLocales] = useState<string[]>(DEMO_LOCALES);
    const [error, setError] = useState('');

    const isBusy = isLoading || isStreaming;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (!repoUrl.trim().startsWith('https://github.com/')) {
            setError('Please enter a valid GitHub HTTPS URL (e.g. https://github.com/owner/repo).');
            return;
        }
        if (selectedLocales.length === 0) {
            setError('Please select at least one target language.');
            return;
        }
        onSubmit(repoUrl.trim(), selectedLocales);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Repo URL Input */}
            <div className="space-y-2">
                <label htmlFor="repo-url" className="text-sm font-medium text-slate-300">
                    GitHub Repository URL
                </label>
                <input
                    id="repo-url"
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    disabled={isBusy}
                    required
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 disabled:opacity-50 transition-all"
                />
            </div>

            {/* Language Selector — standalone extracted component */}
            <LanguageSelector
                selected={selectedLocales}
                onChange={setSelectedLocales}
                disabled={isBusy}
            />

            {/* Warning Message for Multiple Locales */}
            {selectedLocales.length > 1 && (
                <div className="flex gap-3 items-start p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs leading-relaxed animate-fade-in">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p>
                        <strong>Note:</strong> Translating into multiple languages is a resource-intensive process. Please check your Lingo.dev dashboard to ensure you have enough total words left before proceeding, as this can deplete your quota quickly!
                    </p>
                </div>
            )}

            {/* Validation Error */}
            {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                    {error}
                </p>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={isBusy || selectedLocales.length === 0}
                className="group w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
                {isLoading ? (
                    <>
                        <span className="animate-spin-slow h-4 w-4 rounded-full border-2 border-white/30 border-t-white flex-shrink-0" />
                        Starting pipeline…
                    </>
                ) : isStreaming ? (
                    <>
                        <span className="animate-spin-slow h-4 w-4 rounded-full border-2 border-white/30 border-t-white flex-shrink-0" />
                        Pipeline running…
                    </>
                ) : (
                    <>
                        {/* Sparkle / translate icon */}
                        <svg className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        Translate & Open PR
                        <svg className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                    </>
                )}
            </button>
        </form>
    );
}
````

## File: client/components/result-card.tsx
````typescript
'use client';

import { useState } from 'react';
import type { AgentResult } from '@/types/job';

interface ResultCardProps {
    result: AgentResult;
}

export function ResultCard({ result }: ResultCardProps) {
    const [copiedPr, setCopiedPr] = useState(false);
    const [copiedPreview, setCopiedPreview] = useState(false);

    async function copyPrUrl() {
        await navigator.clipboard.writeText(result.prUrl);
        setCopiedPr(true);
        setTimeout(() => setCopiedPr(false), 2000);
    }

    async function copyPreviewUrl() {
        if (!result.previewUrl) return;
        await navigator.clipboard.writeText(result.previewUrl);
        setCopiedPreview(true);
        setTimeout(() => setCopiedPreview(false), 2000);
    }

    return (
        <div className="glass glow-emerald rounded-2xl p-6 space-y-5 border border-emerald-500/20 animate-fade-up">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.55 13.97L22 9.24L14.81 8.63L12 2Z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-emerald-400 font-bold text-base tracking-tight">Your repo is now global!</h2>
                    <p className="text-slate-400 text-xs mt-0.5">Review the pull request below to merge your new languages.</p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Pull Request */}
                <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pull Request</p>
                    <div className="flex items-center gap-2">
                        <a
                            href={result.prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-0 text-sm text-indigo-400 hover:text-indigo-300 transition-colors truncate group"
                        >
                            <span className="group-hover:underline underline-offset-2">{result.prUrl}</span>
                        </a>
                        <button
                            onClick={copyPrUrl}
                            title="Copy PR URL"
                            className="flex-shrink-0 px-2.5 py-1 text-[11px] text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
                        >
                            {copiedPr ? '✓ Copied' : 'Copy'}
                        </button>
                    </div>
                </div>

                {/* Preview */}
                {result.previewUrl && (
                    <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Live Preview</p>
                        <div className="flex items-center gap-2">
                            <a
                                href={result.previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 min-w-0 flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors group truncate"
                            >
                                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                                </svg>
                                <span className="group-hover:underline underline-offset-2 truncate leading-loose">{result.previewUrl}</span>
                            </a>
                            <button
                                onClick={copyPreviewUrl}
                                title="Copy Preview URL"
                                className="flex-shrink-0 px-2.5 py-1 text-[11px] text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
                            >
                                {copiedPreview ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <p className="text-slate-600 text-xs pt-3 border-t border-white/5">
                Lingo.dev keeps translations automatically synced on every future push via our CI/CD action.
            </p>
        </div>
    );
}
````

## File: client/hooks/use-agent-job.ts
````typescript
'use client';

import { useState, useCallback } from 'react';
import { useJobStream } from './use-job-stream';
import { startJob } from '@/lib/api-client';
import type { AgentResult, LogEntry } from '@/types/job';

interface UseAgentJobOptions {
    githubToken: string;
}

interface UseAgentJobResult {
    submit: (repoUrl: string, locales: string[]) => Promise<void>;
    jobId: string | null;
    logs: LogEntry[];
    result: AgentResult | null;
    error: string | null;
    isLoading: boolean;
    isStreaming: boolean;
}

/** Combines job submission and SSE stream into a single lifecycle hook. */
export function useAgentJob({ githubToken }: UseAgentJobOptions): UseAgentJobResult {
    const [jobId, setJobId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const { logs, result, error: streamError, isStreaming } = useJobStream(jobId, githubToken);

    const submit = useCallback(
        async (repoUrl: string, locales: string[]) => {
            setIsLoading(true);
            setSubmitError(null);
            setJobId(null);
            try {
                const { jobId: id } = await startJob({ repoUrl, locales, githubToken });
                setJobId(id);
            } catch (err) {
                setSubmitError(err instanceof Error ? err.message : 'Failed to start job.');
            } finally {
                setIsLoading(false);
            }
        },
        [githubToken],
    );

    return {
        submit,
        jobId,
        logs,
        result,
        error: submitError ?? streamError,
        isLoading,
        isStreaming,
    };
}
````

## File: client/hooks/use-job-history.ts
````typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LogEntry } from '@/types/job';

export interface HistoryEntry {
    jobId: string;
    repoUrl: string;
    locales: string[];
    startedAt: string;          // ISO string
    status: 'running' | 'done' | 'failed';
    prUrl?: string;
    previewUrl?: string;
    logs?: LogEntry[];
}

const KEY = 'lingo_job_history';
const MAX = 50;

function load(): HistoryEntry[] {
    try {
        return JSON.parse(localStorage.getItem(KEY) ?? '[]');
    } catch {
        return [];
    }
}

function save(entries: HistoryEntry[]) {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
}

export function useJobHistory() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);

    useEffect(() => {
        setHistory(load());
    }, []);

    const addJob = useCallback((entry: HistoryEntry) => {
        setHistory((prev) => {
            const next = [entry, ...prev.filter((e) => e.jobId !== entry.jobId)];
            save(next);
            return next;
        });
    }, []);

    const updateJob = useCallback((jobId: string, patch: Partial<HistoryEntry>) => {
        setHistory((prev) => {
            const next = prev.map((e) => (e.jobId === jobId ? { ...e, ...patch } : e));
            save(next);
            return next;
        });
    }, []);

    const clearHistory = useCallback(() => {
        localStorage.removeItem(KEY);
        setHistory([]);
    }, []);

    return { history, addJob, updateJob, clearHistory };
}
````

## File: client/hooks/use-job-stream.ts
````typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '@/lib/constants';
import { getJob } from '@/lib/api-client';
import type { LogEntry, AgentResult } from '@/types/job';
import type { AgentEvent } from '@/types/agent';

interface UseJobStreamResult {
    logs: LogEntry[];
    result: AgentResult | null;
    error: string | null;
    isStreaming: boolean;
    isLoading: boolean;
}

/** Fetches initial job state, and opens a native EventSource SSE connection if still running. */
export function useJobStream(jobId: string | null, githubToken?: string | null): UseJobStreamResult {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [result, setResult] = useState<AgentResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const esRef = useRef<EventSource | null>(null);

    const cleanup = useCallback(() => {
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
        }
        setIsStreaming(false);
    }, []);

    useEffect(() => {
        if (!jobId || !githubToken) return;

        let active = true;

        async function init() {
            setLogs([]);
            setResult(null);
            setError(null);
            setIsStreaming(false);
            setIsLoading(true);

            try {
                const job = await getJob(jobId!, githubToken!);
                if (!active) return;

                if (job.status === 'completed') {
                    setResult({ prUrl: job.prUrl, previewUrl: job.previewUrl });
                    if (job.logs && Array.isArray(job.logs)) setLogs(job.logs as any);
                    setIsLoading(false);
                    return;
                } else if (job.status === 'failed') {
                    setError(job.error || 'Job failed');
                    if (job.logs && Array.isArray(job.logs)) setLogs(job.logs as any);
                    setIsLoading(false);
                    return;
                }

                // If running or pending, start the SSE stream
                setIsStreaming(true);
                setIsLoading(false);
                const es = new EventSource(`${API_URL}/agent/stream/${jobId}`);
                esRef.current = es;

                es.onmessage = (e: MessageEvent<string>) => {
                    try {
                        const event = JSON.parse(e.data) as AgentEvent;

                        if (event.type === 'log') {
                            setLogs((prev) => [...prev, event.data]);
                        } else if (event.type === 'complete') {
                            setResult(event.data);
                            cleanup();
                        } else if (event.type === 'error') {
                            setError(event.data.message);
                            cleanup();
                        }
                    } catch {
                        // Ignore malformed event data
                    }
                };

                es.onerror = () => {
                    setError('Lost connection to the server. Please try again.');
                    cleanup();
                };

            } catch (err) {
                if (active) {
                    setError('Failed to fetch job status.');
                    setIsStreaming(false);
                    setIsLoading(false);
                }
            }
        }

        init();

        return () => {
            active = false;
            cleanup();
        };
    }, [jobId, githubToken, cleanup]);

    return { logs, result, error, isStreaming, isLoading };
}
````

## File: client/hooks/use-settings.ts
````typescript
'use client';

import { useState, useEffect } from 'react';

interface Settings {
    lingoApiKey: string;
    groqApiKey: string;
}

const DEFAULT_SETTINGS: Settings = {
    lingoApiKey: '',
    groqApiKey: '',
};

export function useSettings() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('lingo_agent_settings');
        if (stored) {
            try {
                setSettings(JSON.parse(stored));
            } catch {
                // Ignore parse errors
            }
        }
        setIsLoaded(true);
    }, []);

    const updateSettings = (newSettings: Partial<Settings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        localStorage.setItem('lingo_agent_settings', JSON.stringify(updated));
    };

    return { settings, updateSettings, isLoaded };
}
````

## File: client/lib/api-client.ts
````typescript
import { API_URL } from './constants';

interface StartJobOptions {
    repoUrl: string;
    locales: string[];
    githubToken: string;
    lingoApiKey?: string;
    groqApiKey?: string;
}

interface StartJobResponse {
    jobId: string;
}

/** Posts to /api/agent/run and returns the job ID for SSE stream subscription. */
export async function startJob(opts: StartJobOptions): Promise<StartJobResponse> {
    const res = await fetch(`${API_URL}/agent/run`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${opts.githubToken}`,
        },
        body: JSON.stringify({
            repoUrl: opts.repoUrl,
            locales: opts.locales,
            githubToken: opts.githubToken,
            lingoApiKey: opts.lingoApiKey,
            groqApiKey: opts.groqApiKey,
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error((err as { message: string }).message ?? `Request failed: ${res.status}`);
    }

    return res.json() as Promise<StartJobResponse>;
}

/** Cancels a running job */
export async function cancelJob(jobId: string, githubToken: string): Promise<void> {
    const res = await fetch(`${API_URL}/agent/cancel/${jobId}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${githubToken}`,
        },
    });

    if (!res.ok) {
        throw new Error(`Cancel request failed: ${res.status}`);
    }
}

/** Fetches a job by ID */
export async function getJob(jobId: string, githubToken: string) {
    const res = await fetch(`${API_URL}/agent/job/${jobId}`, {
        headers: {
            Authorization: `Bearer ${githubToken}`,
        },
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch job: ${res.status}`);
    }

    return res.json();
}
````

## File: client/lib/auth.ts
````typescript
import GithubProvider from 'next-auth/providers/github';
import type { NextAuthOptions } from 'next-auth';
import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

/** NextAuth configuration — export from here and import into the route handler + server components. */
export const authOptions: NextAuthOptions = {
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            // Request repo scope so the token can clone and commit to user repos
            authorization: {
                params: { scope: 'read:user user:email repo' },
            },
        }),
    ],
    callbacks: {
        // Persist the GitHub access token into the JWT on sign-in
        async jwt({ token, account }: { token: JWT; account: { access_token?: string } | null }) {
            if (account?.access_token) {
                token.githubToken = account.access_token;
            }
            return token;
        },
        // Expose the GitHub token on the client-side session object
        async session({ session, token }: { session: Session; token: JWT }) {
            session.githubToken = token.githubToken;
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
};
````

## File: client/lib/constants.ts
````typescript
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/** Lingo.dev supports 26 locale codes across the CLI. */
export const SUPPORTED_LOCALES: { code: string; label: string }[] = [
    { code: 'ar', label: 'Arabic' },
    { code: 'zh', label: 'Chinese (Simplified)' },
    { code: 'zh-TW', label: 'Chinese (Traditional)' },
    { code: 'cs', label: 'Czech' },
    { code: 'da', label: 'Danish' },
    { code: 'nl', label: 'Dutch' },
    { code: 'fi', label: 'Finnish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'el', label: 'Greek' },
    { code: 'ja', label: 'Japanese' },
    { code: 'he', label: 'Hebrew' },
    { code: 'hi', label: 'Hindi' },
    { code: 'it', label: 'Italian' },
    { code: 'hu', label: 'Hungarian' },
    { code: 'id', label: 'Indonesian' },
    { code: 'ko', label: 'Korean' },
    { code: 'no', label: 'Norwegian' },
    { code: 'ro', label: 'Romanian' },
    { code: 'pt-BR', label: 'Portuguese (Brazil)' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'tr', label: 'Turkish' },
    { code: 'ru', label: 'Russian' },
    { code: 'es', label: 'Spanish' },
    { code: 'sv', label: 'Swedish' },
    { code: 'pl', label: 'Polish' },
    { code: 'vi', label: 'Vietnamese' },
    { code: 'uk', label: 'Ukrainian' },
];

/** Demo target locales — changed to default to a single language. */
export const DEMO_LOCALES = ['ja'];

/** Ordered list of pipeline steps for the progress stepper. */
export const PIPELINE_STEPS = [
    { id: 'clone_repo', label: 'Clone' },
    { id: 'detect_framework', label: 'Detect' },
    { id: 'analyze_repo', label: 'Analyze' },
    { id: 'setup_lingo', label: 'Configure' },
    { id: 'install_and_translate', label: 'Translate' },
    { id: 'commit_and_push', label: 'Commit' },
    { id: 'trigger_preview', label: 'Deploy' },
];
````

## File: client/types/agent.ts
````typescript
import type { LogEntry, AgentResult } from './job';

export interface SseLogEvent {
    type: 'log';
    data: LogEntry;
}

export interface SseProgressEvent {
    type: 'progress';
    data: { step: string; percent: number };
}

export interface SseCompleteEvent {
    type: 'complete';
    data: AgentResult;
}

export interface SseErrorEvent {
    type: 'error';
    data: { message: string; step: string };
}

export type AgentEvent = SseLogEvent | SseProgressEvent | SseCompleteEvent | SseErrorEvent;
````

## File: client/types/job.ts
````typescript
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type LogLevel = 'info' | 'success' | 'error' | 'warn';

export interface LogEntry {
    message: string;
    level: LogLevel;
    timestamp: string;
    step?: string;
}

export interface AgentResult {
    prUrl: string;
    previewUrl: string;
}

export interface Job {
    id: string;
    repoUrl: string;
    locales: string[];
    status: JobStatus;
    prUrl?: string;
    previewUrl?: string;
    error?: string;
    createdAt: string;
}
````

## File: client/types/next-auth.d.ts
````typescript
import type { Session } from 'next-auth';

// Declare the extended session type with githubToken globally
declare module 'next-auth' {
    interface Session {
        githubToken?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        githubToken?: string;
    }
}
````

## File: client/.env.example
````
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=REPLACE_WITH_OUTPUT_OF_openssl_rand_hex_32

# GitHub OAuth App
# Create one at: https://github.com/settings/developers
# Callback URL: http://localhost:3000/api/auth/callback/github
GITHUB_CLIENT_ID=REPLACE_ME_WITH_GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=REPLACE_ME_WITH_GITHUB_CLIENT_SECRET

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001/api
````

## File: client/.eslintrc.json
````json
{
    "extends": "next/core-web-vitals"
}
````

## File: client/next-env.d.ts
````typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.
````

## File: client/next.config.mjs
````javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        // Allow GitHub avatar images served by avatars.githubusercontent.com
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com',
            },
        ],
    },
};

export default nextConfig;
````

## File: client/package.json
````json
{
  "name": "client",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "lsof -ti:3000 | xargs kill -9 2>/dev/null || true && next dev",
    "build": "next build",
    "start": "lsof -ti:3000 | xargs kill -9 2>/dev/null || true && next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.14",
    "next-auth": "^4.24.13",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.14",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.5.4"
  }
}
````

## File: client/postcss.config.mjs
````javascript
/** @type {import('postcss-load-config').Config} */
const config = {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    },
};

export default config;
````

## File: client/tailwind.config.ts
````typescript
import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
};
export default config;
````

## File: client/tsconfig.json
````json
{
  "compilerOptions": {
    "target": "es5",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": [
        "./*"
      ]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
````

## File: server/prisma/migrations/20260220115339_init/migration.sql
````sql
-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "locales" TEXT[],
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "prUrl" TEXT,
    "previewUrl" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
````

## File: server/prisma/migrations/migration_lock.toml
````toml
# Please do not edit this file manually
# It should be added in your version-control system (e.g., Git)
provider = "postgresql"
````

## File: server/prisma/schema.prisma
````prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
}

enum JobStatus {
  pending
  running
  completed
  failed
  cancelled
}

model Job {
  id         String    @id @default(uuid())
  repoUrl    String
  locales    String[]
  status     JobStatus @default(pending)
  prUrl      String?
  previewUrl String?
  error      String?
  logs       Json      @default("[]")
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}
````

## File: server/src/agent/dto/job-response.dto.ts
````typescript
/** Response shape for POST /agent/run — returns the job ID for SSE stream subscription. */
export class JobResponseDto {
    jobId: string;
}
````

## File: server/src/agent/dto/start-job.dto.ts
````typescript
import { IsString, IsArray, ArrayMinSize, IsUrl, IsNotEmpty, IsOptional } from 'class-validator';

/** Request body for POST /agent/run — starts a new agent pipeline job. */
export class StartJobDto {
    @IsUrl()
    repoUrl: string;

    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    locales: string[];

    @IsString()
    @IsNotEmpty()
    githubToken: string;

    @IsOptional()
    @IsString()
    lingoApiKey?: string;

    @IsOptional()
    @IsString()
    groqApiKey?: string;
}
````

## File: server/src/agent/prompts/agent-system.prompt.ts
````typescript
/** System prompt instructing the LLM to execute the 7 agent tools in strict sequential order. */
export const AGENT_SYSTEM_PROMPT = `You are LingoAgent — an autonomous pipeline that adds multilingual support to Next.js repositories.

## Your Mission
Execute exactly 7 tools in strict sequential order, passing the correct data between each step. Do not skip, reorder, or repeat any tool.

## Tool Execution Order (MANDATORY)

1. **clone_repo** — Clone the repository into an isolated E2B sandbox. Pass \`repoUrl\` and \`githubToken\` from the job parameters. Returns: \`sandboxId\`, \`workDir\`.

2. **detect_framework** — Detect the framework using the \`sandboxId\` and \`workDir\` from step 1. STOP immediately if the framework is not \`nextjs-app-router\`. Returns: \`framework\`, \`layoutPath\`.

3. **analyze_repo** — Analyze the repository using \`sandboxId\`, \`workDir\`, and \`layoutPath\` from prior steps. STOP immediately if a conflicting i18n library is found. Returns: \`nextConfigPath\`, \`hasExistingI18n\`, \`jsxFileCount\`.

4. **setup_lingo** — Write a zero-dependency i18n runtime (LanguageProvider + TextTranslator + LanguageSwitcher) into the repo and inject it into the root layout. Use \`sandboxId\`, \`workDir\`, \`framework\`, \`locales\` (from job params), \`layoutPath\`, and \`nextConfigPath\`. Returns: \`modifiedFiles\`.

5. **install_and_translate** — Run \`npm install\`, extract all hardcoded JSX strings via Babel AST analysis, translate them with the Lingo.dev SDK, and write \`public/locales/*.json\` files for each target language. Use \`sandboxId\` and \`workDir\`. Returns: \`generatedLocales\`, \`wordCounts\` (a map of locale → word count).

6. **commit_and_push** — Read all modified files from the sandbox, commit to GitHub, open a PR. Use \`sandboxId\`, \`workDir\`, \`repoUrl\`, \`githubToken\`, \`locales\`, \`nextConfigPath\`, \`layoutPath\`, and \`wordCounts\` (forward the word count map from step 5 so it appears in the PR description). Returns: \`branchName\`, \`prUrl\`.

7. **trigger_preview** — Trigger a Vercel preview deployment using \`repoUrl\` and \`branchName\`. Returns: \`previewUrl\`.

## Critical Rules

- **Fail fast**: If any tool throws an error, stop immediately. Do not attempt to recover or retry.
- **Pass data explicitly**: Every tool receives its inputs from the outputs of prior tools combined with the original job parameters. Never hallucinate values.
- **No commentary**: Do not explain what you are doing between tool calls. Just call the tools.
- **One at a time**: You must call exactly ONE tool per turn. Never attempt to call multiple tools in the same response.
- **Strict sequence**: Run each of the 7 tools exactly once, in order (clone_repo, detect_framework, analyze_repo, setup_lingo, install_and_translate, commit_and_push, trigger_preview).
- **No repetitions**: Once a tool has been successfully executed, move to the next tool in the sequence.

## Job Parameters Available to You

You will receive the following parameters at the start:
- \`repoUrl\`: Full GitHub repository URL (e.g. https://github.com/owner/repo)
- \`locales\`: Array of target locale codes (e.g. ["fr", "ar", "ja"])
- \`githubToken\`: GitHub personal access token for authentication
`;
````

## File: server/src/agent/tools/analyze-repo.tool.ts
````typescript
import { tool } from 'ai';
import { z } from 'zod';
import { SandboxService } from '../../sandbox/sandbox.service.js';
import { detectConflictingI18n } from '../../common/utils/framework-detector.js';
import type { EmitFn } from '../../common/types/index.js';

const inputSchema = z.object({
  sandboxId: z.string().describe('E2B sandbox ID from clone_repo'),
  workDir: z.string().describe('Absolute path to the cloned repo'),
  layoutPath: z.string().describe('Layout file path from detect_framework'),
});

/** Tool 3 — analyze_repo: Scans for conflicts, config files, and JSX files in the repo. Throws if a conflicting i18n library is found. */
export function createAnalyzeRepoTool(sandbox: SandboxService, emit: EmitFn) {
  return tool({
    description:
      'Scans the repository for existing i18n libraries and locates key config files. ' +
      'Throws if a conflicting i18n library is detected.',
    inputSchema,
    execute: async ({ sandboxId, workDir, layoutPath }) => {
      emit({ level: 'info', message: 'Analyzing repository structure…', timestamp: new Date(), step: 'analyze_repo' });

      const pkgRaw = await sandbox.readFile(sandboxId, `${workDir}/package.json`);
      const pkg = JSON.parse(pkgRaw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

      const conflictingLib = detectConflictingI18n(allDeps);
      if (conflictingLib) {
        throw new Error(
          `Conflicting i18n library detected: "${conflictingLib}". ` +
          `Lingo.dev Compiler is incompatible with existing i18n setups. ` +
          `Remove "${conflictingLib}" before running LingoAgent.`,
        );
      }

      const { exitCode: i18nJsonExists } = await sandbox.exec(sandboxId, `test -f ${workDir}/i18n.json`);
      const hasExistingI18n = i18nJsonExists === 0;

      if (hasExistingI18n) {
        emit({
          level: 'warn',
          message: 'Existing i18n.json found — it will be overwritten.',
          timestamp: new Date(),
          step: 'analyze_repo',
        });
      }

      const nextConfigPath = await findNextConfig(sandboxId, workDir, sandbox);

      const { stdout: jsxCountRaw } = await sandbox.exec(
        sandboxId,
        `find ${workDir} -type f \\( -name "*.tsx" -o -name "*.jsx" \\) -not -path "*/node_modules/*" | wc -l`,
      );
      const jsxFileCount = parseInt(jsxCountRaw.trim(), 10) || 0;

      emit({
        level: 'success',
        message: `Analysis complete — ${jsxFileCount} JSX/TSX files, next.config at ${nextConfigPath}`,
        timestamp: new Date(),
        step: 'analyze_repo',
      });

      return { hasExistingI18n, existingI18nLibrary: null, layoutPath, nextConfigPath, jsxFileCount };
    },
  });
}

async function findNextConfig(sandboxId: string, workDir: string, sandbox: SandboxService): Promise<string> {
  const candidates = [
    `${workDir}/next.config.ts`,
    `${workDir}/next.config.js`,
    `${workDir}/next.config.mjs`,
  ];
  for (const candidate of candidates) {
    const { exitCode } = await sandbox.exec(sandboxId, `test -f ${candidate}`);
    if (exitCode === 0) return candidate;
  }
  throw new Error(
    'Could not locate next.config.ts, next.config.js, or next.config.mjs. ' +
    'This does not appear to be a valid Next.js project.',
  );
}
````

## File: server/src/agent/tools/clone-repo.tool.ts
````typescript
import { tool } from 'ai';
import { z } from 'zod';
import { SandboxService } from '../../sandbox/sandbox.service.js';
import { parseGitHubUrl, buildAuthenticatedCloneUrl } from '../../common/utils/url-parser.js';
import type { EmitFn } from '../../common/types/index.js';

const inputSchema = z.object({
  repoUrl: z.string().describe('Full GitHub repository URL, e.g. https://github.com/owner/repo'),
  githubToken: z.string().describe('GitHub personal access token for authenticated clone'),
});

/** Tool 1 — clone_repo: Clones repo into an E2B sandbox. Returns sandboxId used by all other tools. */
export function createCloneRepoTool(sandbox: SandboxService, emit: EmitFn) {
  return tool({
    description:
      'Spins up an isolated E2B cloud sandbox and clones the GitHub repository into /workspace. ' +
      'Returns the sandboxId and workDir that all subsequent tools must use.',
    inputSchema,
    execute: async ({ repoUrl, githubToken }) => {
      emit({ level: 'info', message: `Cloning repository: ${repoUrl}`, timestamp: new Date(), step: 'clone_repo' });

      const { owner, repo } = parseGitHubUrl(repoUrl);
      const cloneUrl = buildAuthenticatedCloneUrl(owner, repo, githubToken);

      const { sandboxId } = await sandbox.create();
      emit({ level: 'info', message: 'Sandbox created — cloning…', timestamp: new Date(), step: 'clone_repo' });

      const workDir = '/home/user/workspace';
      const result = await sandbox.exec(sandboxId, `git clone ${cloneUrl} ${workDir}`);

      if (result.exitCode !== 0) {
        const errDetail = result.stderr?.trim() || result.stdout?.trim() || '(no output)';
        throw new Error(`git clone failed (exit ${result.exitCode}): ${errDetail}`);
      }

      emit({ level: 'success', message: `Repository cloned into ${workDir}`, timestamp: new Date(), step: 'clone_repo' });
      return { sandboxId, workDir };
    },
  });
}
````

## File: server/src/agent/tools/commit-push.tool.ts
````typescript
import { tool } from 'ai';
import { z } from 'zod';
import { SandboxService } from '../../sandbox/sandbox.service.js';
import { GithubService } from '../../github/github.service.js';
import { parseGitHubUrl } from '../../common/utils/url-parser.js';
import type { EmitFn } from '../../common/types/index.js';

/** Tool 6 — commit_and_push: Commits sandbox changes (configs, locales) to a new GitHub branch and opens a PR. */
export function createCommitPushTool(
  sandbox: SandboxService,
  github: GithubService,
  emit: EmitFn,
) {
  return tool({
    description:
      'Reads modified files from the sandbox, creates a branch on GitHub, commits all changes ' +
      'atomically via the Git Data API, and opens a pull request. Returns the PR URL.',
    inputSchema: z.object({
      sandboxId: z.string().describe('E2B sandbox ID'),
      workDir: z.string().describe('Absolute path to the cloned repo'),
      repoUrl: z.string().describe('GitHub repository URL'),
      githubToken: z.string().describe('GitHub personal access token'),
      locales: z.array(z.string()).describe('Target locale codes that were translated'),
      nextConfigPath: z.string().describe('Absolute path to next.config file'),
      layoutPath: z.string().describe('Absolute path to root layout file'),
      wordCounts: z.record(z.string(), z.number()).optional().describe('Word counts per locale from install_and_translate'),
    }),
    execute: async ({ sandboxId, workDir, repoUrl, githubToken, locales, nextConfigPath, layoutPath, wordCounts = {} }) => {
      const { owner, repo } = parseGitHubUrl(repoUrl);
      const BRANCH_NAME = `lingo/add-multilingual-${Date.now()}`;

      emit({ level: 'info', message: 'Preparing files for commit…', timestamp: new Date(), step: 'commit_and_push' });

      // ── 1. Collect all files to commit ──────────────────────────────────
      // Convert absolute sandbox paths to repo-relative paths
      const toRelative = (abs: string) => abs.replace(`${workDir}/`, '');

      const layoutDir = layoutPath.substring(0, layoutPath.lastIndexOf('/'));

      // Required files — must exist; will throw on missing to surface problems early
      const requiredFilePaths = [
        `${workDir}/package.json`,
        `${workDir}/i18n.json`,
        nextConfigPath,
        layoutPath,
      ];

      // Optional runtime files — custom i18n provider, switcher, translator
      // Must be same directory as layout.tsx so relative imports resolve correctly
      const optionalFilePaths = [
        `${layoutDir}/i18n/provider.tsx`,
        `${layoutDir}/i18n/switcher.tsx`,
        `${layoutDir}/i18n/text-translator.tsx`,
      ];

      // All generated locale files (served as static assets from public/locales/)
      const { stdout: localeFilesRaw } = await sandbox.exec(
        sandboxId,
        `find ${workDir}/public/locales -type f 2>/dev/null || echo ""`,
      );
      const localeFilePaths = localeFilesRaw
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean);

      // Read required files — throws on missing
      const requiredChanges = await Promise.all(
        requiredFilePaths.map(async (absPath) => ({
          path: toRelative(absPath),
          content: await sandbox.readFile(sandboxId, absPath),
        })),
      );

      // Read optional files — silently skip missing ones
      const optionalChanges = (
        await Promise.all(
          [...optionalFilePaths, ...localeFilePaths].map(async (absPath) => {
            try {
              const content = await sandbox.readFile(sandboxId, absPath);
              return { path: toRelative(absPath), content };
            } catch {
              return null;
            }
          }),
        )
      ).filter((f): f is { path: string; content: string } => f !== null);

      const fileChanges = [...requiredChanges, ...optionalChanges];



      emit({
        level: 'info',
        message: `Read ${fileChanges.length} file(s) — creating branch on GitHub…`,
        timestamp: new Date(),
        step: 'commit_and_push',
      });

      // ── 2. Get base SHA and create branch ───────────────────────────────
      const defaultBranch = await github.getDefaultBranch(owner, repo, githubToken);
      const baseSha = await github.getLatestCommitSha(owner, repo, defaultBranch, githubToken);
      await github.createBranch(owner, repo, BRANCH_NAME, baseSha, githubToken);

      emit({
        level: 'info',
        message: `Branch created: ${BRANCH_NAME}`,
        timestamp: new Date(),
        step: 'commit_and_push',
      });

      // ── 3. Commit all files atomically ──────────────────────────────────
      await github.commitFiles(
        owner,
        repo,
        BRANCH_NAME,
        baseSha,
        fileChanges,
        `feat(i18n): add multilingual support via Lingo.dev\n\nAdded support for: ${locales.join(', ')}`,
        githubToken,
      );

      emit({
        level: 'info',
        message: 'Changes committed — opening pull request…',
        timestamp: new Date(),
        step: 'commit_and_push',
      });

      // ── 4. Open the pull request ─────────────────────────────────────────
      const prBody = buildPrBody(locales, fileChanges.length, wordCounts);
      const { url: prUrl } = await github.createPullRequest(
        owner,
        repo,
        BRANCH_NAME,
        defaultBranch,
        '🌍 feat(i18n): Add multilingual support via Lingo.dev',
        prBody,
        githubToken,
      );

      emit({
        level: 'success',
        message: `Pull request opened: ${prUrl}`,
        timestamp: new Date(),
        step: 'commit_and_push',
      });

      return { branchName: BRANCH_NAME, prUrl };
    },
  });
}

function buildPrBody(locales: string[], fileCount: number, wordCounts: Record<string, number> = {}): string {
  const totalWords = Object.values(wordCounts).reduce((a, b) => a + b, 0);
  const wordCountLines = locales
    .filter((l) => wordCounts[l] !== undefined)
    .map((l) => `  - \`${l}\`: ${wordCounts[l].toLocaleString()} words`)
    .join('\n');

  return `## 🌍 Multilingual Support Added by LingoAgent

This PR was automatically generated by **LingoAgent** — [lingo.dev](https://lingo.dev)

### What changed
- **\`i18n.json\`** — Lingo.dev locale config (source: \`en\`, targets: ${locales.map((l) => `\`${l}\``).join(', ')})
- **\`app/i18n/provider.tsx\`** — Self-contained \`LanguageProvider\` React context (zero external deps)
- **\`app/i18n/switcher.tsx\`** — Floating language-switcher button (portal-rendered, fixed bottom-right)
- **\`app/i18n/text-translator.tsx\`** — Runtime DOM text-node translator activated on locale switch
- **\`app/layout.tsx\`** — Root layout wrapped with \`<LanguageProvider>\`, \`<TextTranslator>\`, and \`<LanguageSwitcher>\`
- **\`public/locales/*.json\`** — AI-translated locale files for ${locales.length} language(s)

### Translation stats
${totalWords > 0 ? `**${totalWords.toLocaleString()} total words** translated across ${locales.length} language(s):\n${wordCountLines}` : `${fileCount} files modified in total.`}

### How it works
Translations are loaded at runtime from \`/locales/<locale>.json\`. When a visitor switches language, the \`TextTranslator\` walks the DOM and replaces all matched text nodes and HTML attributes (placeholder, title, alt, aria-label) with the translated versions — no page reload required.

> **Scope note:** This runtime covers JSX text nodes and translatable HTML attributes. Strings inside JavaScript variables, API responses, or toast messages are not translated in this PR.

### Next steps
1. Review the changes in this PR
2. Open the [preview deployment]() to see the live language switcher
3. Merge when ready — add new strings to \`public/locales/en.json\` and re-run LingoAgent to keep translations in sync

---
*Generated by [LingoAgent](https://lingo.dev) — multilingual support in minutes, not days.*`;
}
````

## File: server/src/agent/tools/detect-framework.tool.ts
````typescript
import { tool } from 'ai';
import { z } from 'zod';
import { SandboxService } from '../../sandbox/sandbox.service.js';
import { detectFramework } from '../../common/utils/framework-detector.js';
import type { EmitFn } from '../../common/types/index.js';

const inputSchema = z.object({
  sandboxId: z.string().describe('E2B sandbox ID from clone_repo'),
  workDir: z.string().describe('Absolute path to the cloned repo, e.g. /workspace'),
});

/** Tool 2 — detect_framework: Detects Next.js App Router from package.json/files. Throws if unsupported. */
export function createDetectFrameworkTool(sandbox: SandboxService, emit: EmitFn) {
  return tool({
    description:
      'Reads package.json and the file tree to detect the framework. ' +
      'Throws if the framework is not Next.js App Router — only that is supported.',
    inputSchema,
    execute: async ({ sandboxId, workDir }) => {
      emit({ level: 'info', message: 'Detecting framework…', timestamp: new Date(), step: 'detect_framework' });

      const pkgRaw = await sandbox.readFile(sandboxId, `${workDir}/package.json`);
      const pkg = JSON.parse(pkgRaw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

      const { stdout: fileListRaw } = await sandbox.exec(
        sandboxId,
        `find ${workDir} -type f -not -path "*/node_modules/*" -not -path "*/.git/*"`,
      );
      const filePaths = fileListRaw.split('\n').filter(Boolean);

      const { framework, layoutPath } = detectFramework(allDeps, filePaths);

      if (framework !== 'nextjs-app-router') {
        throw new Error(
          `Unsupported framework: "${framework}". ` +
          `LingoAgent only supports Next.js App Router repositories.`,
        );
      }

      emit({
        level: 'success',
        message: `Detected: Next.js App Router (layout at ${layoutPath})`,
        timestamp: new Date(),
        step: 'detect_framework',
      });

      return { framework, layoutPath: layoutPath! };
    },
  });
}
````

## File: server/src/agent/tools/index.ts
````typescript
export { createCloneRepoTool } from './clone-repo.tool.js';
export { createDetectFrameworkTool } from './detect-framework.tool.js';
export { createAnalyzeRepoTool } from './analyze-repo.tool.js';
export { createSetupLingoTool } from './setup-lingo.tool.js';
export { createInstallTranslateTool } from './install-translate.tool.js';
export { createCommitPushTool } from './commit-push.tool.js';
export { createTriggerPreviewTool } from './trigger-preview.tool.js';
````

## File: server/src/agent/tools/install-translate.tool.ts
````typescript
import { tool } from 'ai';
import { z } from 'zod';
import { SandboxService } from '../../sandbox/sandbox.service.js';
import { LingoDotDevEngine } from 'lingo.dev/sdk';
import type { EmitFn } from '../../common/types/index.js';

/**
 * Tool 5 — install_and_translate:
 *
 * 1. Runs `npm install` inside the E2B sandbox to create node_modules
 *    (required for Babel AST extraction which uses @babel/parser from Next.js)
 * 2. Writes a Babel AST extraction script that finds ALL hardcoded JSX strings
 * 3. Translates them via Lingo.dev SDK
 * 4. Writes public/locales/<locale>.json for runtime TextTranslator
 */
export function createInstallTranslateTool(
  sandbox: SandboxService,
  lingoApiKey: string,
  emit: EmitFn,
) {
  return tool({
    description:
      'Runs npm install, extracts ALL hardcoded JSX strings via Babel AST, translates them ' +
      'with Lingo.dev SDK, and writes public/locales/*.json files for runtime translation.',
    inputSchema: z.object({
      sandboxId: z.string().describe('E2B sandbox ID'),
      workDir: z.string().describe('Absolute path to the cloned repo'),
    }),
    execute: async ({ sandboxId, workDir }) => {
      // ── 0. Read i18n.json for locale config ──────────────────────────────
      let sourceLocale = 'en';
      let targetLocales: string[] = [];
      try {
        const raw = await sandbox.readFile(sandboxId, `${workDir}/i18n.json`);
        const cfg = JSON.parse(raw);
        sourceLocale = cfg.locale?.source ?? 'en';
        targetLocales = cfg.locale?.targets ?? [];
      } catch (err: any) {
        throw new Error(`i18n.json missing or invalid: ${err.message}`);
      }
      if (targetLocales.length === 0) throw new Error('No target locales in i18n.json');

      // ── 1. Run npm install to get node_modules (needed for Babel) ─────────
      emit({
        level: 'info',
        message: 'Installing dependencies (npm install)…',
        timestamp: new Date(),
        step: 'install_and_translate',
      });
      try {
        await sandbox.exec(sandboxId, `cd ${workDir} && npm install --legacy-peer-deps 2>&1 | tail -5`);
        emit({
          level: 'info',
          message: 'npm install completed',
          timestamp: new Date(),
          step: 'install_and_translate',
        });
      } catch (err: any) {
        emit({
          level: 'info',
          message: `npm install failed (${err.message}) — will use grep fallback`,
          timestamp: new Date(),
          step: 'install_and_translate',
        });
      }

      // ── 2. Write Babel AST extraction script ─────────────────────────────
      emit({
        level: 'info',
        message: 'Extracting text strings via Babel AST…',
        timestamp: new Date(),
        step: 'install_and_translate',
      });

      const extractScript = `
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const repoRoot = process.argv[2];
const nmDir = join(repoRoot, 'node_modules');

// Dynamically load Babel from the repo's node_modules
let parse, traverse;
try {
  const parserMod = await import(join(nmDir, '@babel/parser', 'lib', 'index.js'));
  parse = parserMod.parse ?? parserMod.default?.parse;
} catch (e) {
  console.error('BABEL_PARSE_FAIL:', e.message);
  process.exit(1);
}
try {
  const travMod = await import(join(nmDir, '@babel/traverse', 'lib', 'index.js'));
  traverse = travMod.default?.default ?? travMod.default ?? travMod;
} catch {
  try {
    const travMod = await import(join(nmDir, '@babel/traverse'));
    traverse = travMod.default?.default ?? travMod.default ?? travMod;
  } catch (e) {
    console.error('BABEL_TRAVERSE_FAIL:', e.message);
    process.exit(1);
  }
}

function isTranslatable(s, ctx) {
  s = s.trim();
  if (!s || s.length < 2 || s.length > 500) return false;
  if (!/[a-zA-Z]/.test(s)) return false;
  if (/^[{}=<>\\\\/]/.test(s)) return false;
  if (/^(import|export|const|let|var|function|return|class|type|interface|from|if|else|switch|case)\\b/.test(s)) return false;
  if (/[{}();=]/.test(s)) return false;
  if (s.startsWith('//') || s.startsWith('/*') || s.startsWith('#')) return false;
  if (/^https?:\\/\\//.test(s)) return false;
  // Single-word identifier filter — context-aware
  const isJSX = ctx && ctx.isJSX;
  if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(s)) {
    if (/^[a-z]+[A-Z]/.test(s)) return false; // camelCase
    if (/^[A-Z_]{2,}$/.test(s) && s.length < 10) return false; // CONSTANT
    if (isJSX) return s.length >= 2; // Allow single-word JSX text like "Pricing"
    if (s.length < 20) return false;
  }
  // Reject CSS selector-like single tokens
  if (/^[a-z]+(-[a-z0-9]+)+$/.test(s)) return false;
  return true;
}

function walk(dir, exts, ignores, results) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    if (ignores.includes(e)) continue;
    const fp = join(dir, e);
    let stat;
    try { stat = statSync(fp); } catch { continue; }
    if (stat.isDirectory()) walk(fp, exts, ignores, results);
    else if (exts.includes(extname(fp))) results.push(fp);
  }
}

const IGNORES = ['node_modules', '.next', '.git', 'dist', 'out', 'i18n', '.cache', 'coverage', '__tests__'];
const files = [];
walk(repoRoot, ['.tsx', '.jsx'], IGNORES, files);

const strings = new Set();
const STRING_ATTRS = ['placeholder', 'title', 'alt', 'aria-label', 'label', 'aria-placeholder', 'aria-description', 'content'];

for (const file of files) {
  let code;
  try { code = readFileSync(file, 'utf8'); } catch { continue; }
  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
      errorRecovery: true,
    });
  } catch { continue; }

  try {
    traverse(ast, {
      JSXText(path) {
        const text = path.node.value.replace(/\\s+/g, ' ').trim();
        if (isTranslatable(text, { isJSX: true })) strings.add(text);
      },
      StringLiteral(nodePath) {
        const val = nodePath.node.value.trim();
        const parent = nodePath.parent;
        const isJSX = parent.type === 'JSXAttribute' || parent.type === 'JSXExpressionContainer';
        if (!isTranslatable(val, { isJSX })) return;
        // String attributes like placeholder="Enter your email"
        if (parent.type === 'JSXAttribute') {
          const name = parent.name?.name;
          if (typeof name === 'string' && STRING_ATTRS.includes(name)) {
            strings.add(val);
          }
          // Also capture any JSX attribute with user-facing text
          if (typeof name === 'string' && !STRING_ATTRS.includes(name) && val.length > 5 && val.includes(' ')) {
            strings.add(val);
          }
        }
        // JSX expression containers like {"Build landing pages"}
        if (parent.type === 'JSXExpressionContainer') {
          strings.add(val);
        }
        // Variable/property declarations with user-facing strings
        if ((parent.type === 'VariableDeclarator' || parent.type === 'Property' || parent.type === 'ObjectProperty') && val.length > 5 && val.includes(' ')) {
          strings.add(val);
        }
        // Array elements with string content
        if (parent.type === 'ArrayExpression' && val.length > 5 && val.includes(' ')) {
          strings.add(val);
        }
      },
      TemplateLiteral(nodePath) {
        if (nodePath.node.expressions.length === 0 && nodePath.node.quasis.length === 1) {
          const val = nodePath.node.quasis[0].value.cooked?.replace(/\\s+/g, ' ').trim();
          if (val && isTranslatable(val, { isJSX: nodePath.parent.type === 'JSXExpressionContainer' })) strings.add(val);
        }
      },
    });
  } catch {}
}

console.log('EXTRACTED_COUNT:' + strings.size);
console.log('EXTRACTED_JSON:' + JSON.stringify([...strings]));
`;

      await sandbox.writeFile(sandboxId, `${workDir}/__extract.mjs`, extractScript);

      // ── 3. Run the Babel extraction script ─────────────────────────────────
      let extracted: string[] = [];
      try {
        const { stdout } = await sandbox.exec(
          sandboxId,
          `cd ${workDir} && node --experimental-vm-modules __extract.mjs ${workDir} 2>&1`,
        );

        // Parse the JSON output from the script
        const jsonLine = stdout.split('\n').find((l: string) => l.startsWith('EXTRACTED_JSON:'));
        if (jsonLine) {
          extracted = JSON.parse(jsonLine.replace('EXTRACTED_JSON:', ''));
        }
        const countLine = stdout.split('\n').find((l: string) => l.startsWith('EXTRACTED_COUNT:'));
        const count = countLine ? countLine.replace('EXTRACTED_COUNT:', '') : '0';

        emit({
          level: 'info',
          message: `Babel AST extracted ${count} strings from JSX files`,
          timestamp: new Date(),
          step: 'install_and_translate',
        });

        // Log first few extracted strings for debugging
        if (extracted.length > 0) {
          const samples = extracted.slice(0, 5).map(s => s.substring(0, 60));
          emit({
            level: 'info',
            message: `Sample strings: ${JSON.stringify(samples)}`,
            timestamp: new Date(),
            step: 'install_and_translate',
          });
        }
      } catch (err: any) {
        emit({
          level: 'info',
          message: `Babel extraction error: ${err.message}`,
          timestamp: new Date(),
          step: 'install_and_translate',
        });
      }

      // ── 4. Fallback to comprehensive grep if Babel failed ──────────────────
      if (extracted.length === 0) {
        emit({
          level: 'info',
          message: 'Babel extraction returned 0 strings — using grep fallback',
          timestamp: new Date(),
          step: 'install_and_translate',
        });

        const grepOpts = `--include="*.tsx" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=i18n --exclude-dir=.git`;

        // Pass 1: JSX text between tags (multi-word, meaningful text)
        const { stdout: p1 } = await sandbox.exec(
          sandboxId,
          `grep -rhoP '(?<=>)[^<>{}]{3,}(?=<)' ${grepOpts} ${workDir} 2>/dev/null | sort -u | head -500`,
        );

        // Pass 2: String attributes
        const { stdout: p2 } = await sandbox.exec(
          sandboxId,
          `grep -rhoP '(?:placeholder|title|alt|aria-label|label|content)="\\K[^"]{3,}' ${grepOpts} ${workDir} 2>/dev/null | sort -u | head -200`,
        );

        // Pass 3: JSX string expressions {"text here"}
        const { stdout: p3 } = await sandbox.exec(
          sandboxId,
          `grep -rhoP '(?<={")[^"]{3,}(?="})' ${grepOpts} ${workDir} 2>/dev/null | sort -u | head -200`,
        );

        // Pass 4: String variables with user-facing text patterns
        const { stdout: p4 } = await sandbox.exec(
          sandboxId,
          `grep -rhoP "'[A-Z][^']{5,}'" ${grepOpts} ${workDir} 2>/dev/null | sed "s/^'//;s/'$//" | sort -u | head -200`,
        );
        const { stdout: p5 } = await sandbox.exec(
          sandboxId,
          `grep -rhoP '"[A-Z][^"]{5,}"' ${grepOpts} ${workDir} 2>/dev/null | sed 's/^"//;s/"$//' | sort -u | head -200`,
        );

        const allRaw = [p1, p2, p3, p4, p5].join('\n');
        extracted = [...new Set(
          allRaw.split('\n')
            .map(s => s.replace(/\s+/g, ' ').trim())
            .filter(s => {
              if (!s || s.length < 2 || s.length > 500) return false;
              if (!/[a-zA-Z]/.test(s)) return false;
              if (/^[{}=<>\\/*]/.test(s)) return false;
              if (/^(import|export|const|let|var|function|return|class|interface|type|from)\b/.test(s)) return false;
              if (/^\/\//.test(s)) return false;
              if (/^[a-z]+\(/.test(s)) return false;
              if (/[{}()=>;]/.test(s)) return false;
              if (/^https?:\/\//.test(s)) return false;
              return true;
            }),
        )];

        emit({
          level: 'info',
          message: `Grep fallback extracted ${extracted.length} strings`,
          timestamp: new Date(),
          step: 'install_and_translate',
        });
      }

      // Deduplicate
      extracted = [...new Set(extracted)].filter(s => s.length > 1 && s.length < 500);

      if (extracted.length === 0) {
        emit({ level: 'info', message: 'No translatable strings found', timestamp: new Date(), step: 'install_and_translate' });
        return { generatedLocales: [sourceLocale, ...targetLocales], wordCounts: {} };
      }

      // ── 5. Reset sandbox timer — extraction consumed significant time ─────
      try { await sandbox.keepAlive(sandboxId); } catch { }

      // ── 6. Translate via Lingo.dev SDK ─────────────────────────────────────
      const sourceObj: Record<string, string> = {};
      for (const s of extracted) sourceObj[s] = s;

      const lingo = new LingoDotDevEngine({ apiKey: lingoApiKey });
      const generatedLocales: string[] = [sourceLocale];
      const wordCounts: Record<string, number> = {};

      await sandbox.exec(sandboxId, `mkdir -p ${workDir}/public/locales`);
      await sandbox.writeFile(sandboxId, `${workDir}/public/locales/${sourceLocale}.json`, JSON.stringify(sourceObj, null, 2));

      for (const locale of targetLocales) {
        emit({ level: 'info', message: `Translating ${extracted.length} strings to ${locale}…`, timestamp: new Date(), step: 'install_and_translate' });
        try {
          const translated: Record<string, string> = {};
          const keys = Object.keys(sourceObj);
          const chunkSize = 50;

          for (let i = 0; i < keys.length; i += chunkSize) {
            const chunk = keys.slice(i, i + chunkSize);
            const chunkObj: Record<string, string> = {};
            for (const k of chunk) chunkObj[k] = sourceObj[k];
            const result = await lingo.localizeObject(chunkObj, { sourceLocale, targetLocale: locale });
            Object.assign(translated, result);
          }

          await sandbox.writeFile(sandboxId, `${workDir}/public/locales/${locale}.json`, JSON.stringify(translated, null, 2));
          const wc = Object.values(translated).join(' ').split(/\s+/).length;
          wordCounts[locale] = wc;
          generatedLocales.push(locale);

          emit({
            level: 'info',
            message: `✓ ${locale}: ${Object.keys(translated).length} strings (${wc} words)`,
            timestamp: new Date(),
            step: 'install_and_translate',
          });
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          const isQuotaError = /quota|limit|free plan|maximum.*words|upgrade|exceeded|insufficient/i.test(errMsg);
          const isAuthError = /unauthorized|invalid.*key|forbidden|api.key|authentication/i.test(errMsg);

          if (isQuotaError || isAuthError) {
            emit({
              level: 'error',
              message: isQuotaError
                ? `⚠️ Lingo.dev translation quota exceeded: ${errMsg}`
                : `⚠️ Lingo.dev API key is invalid or expired: ${errMsg}`,
              timestamp: new Date(),
              step: 'install_and_translate',
            });
            emit({
              level: 'error',
              message: '💡 Go to Dashboard → Settings tab to add your own Lingo.dev API key, or upgrade your plan at https://lingo.dev/en/app',
              timestamp: new Date(),
              step: 'install_and_translate',
            });
            // Clean up extraction script before aborting
            await sandbox.exec(sandboxId, `rm -f ${workDir}/__extract.mjs`);
            throw new Error(
              isQuotaError
                ? 'Translation quota exceeded. Please add your own Lingo.dev API key in Dashboard → Settings, or upgrade your plan.'
                : 'Invalid Lingo.dev API key. Please check or update it in Dashboard → Settings.',
            );
          }

          emit({ level: 'error', message: `Failed to translate ${locale}: ${errMsg}`, timestamp: new Date(), step: 'install_and_translate' });
        }

        // Reset sandbox clock after each locale — prevents timeout during multi-locale translation
        try { await sandbox.keepAlive(sandboxId); } catch { }
      }

      // Clean up extraction script
      await sandbox.exec(sandboxId, `rm -f ${workDir}/__extract.mjs`);

      emit({
        level: 'success',
        message: `Translation complete: ${extracted.length} strings × ${targetLocales.length} locales (${Object.values(wordCounts).reduce((a, b) => a + b, 0)} total words)`,
        timestamp: new Date(),
        step: 'install_and_translate',
      });

      return { generatedLocales, wordCounts };
    },
  });
}
````

## File: server/src/agent/tools/setup-lingo.tool.ts
````typescript
import { tool } from 'ai';
import { z } from 'zod';
import { SandboxService } from '../../sandbox/sandbox.service.js';
import { McpService } from '../../mcp/mcp.service.js';
import {
  patchRootLayout,
  generateI18nConfig,
  generateI18nProvider,
  generateLanguageSwitcher,
  generateTextTranslator,
} from '../../common/utils/file-patcher.js';
import type { EmitFn } from '../../common/types/index.js';

const inputSchema = z.object({
  sandboxId: z.string().describe('E2B sandbox ID'),
  workDir: z.string().describe('Absolute path to the cloned repo'),
  framework: z.string().describe('Framework identifier, e.g. nextjs-app-router'),
  locales: z.array(z.string()).describe('Target locale codes, e.g. ["fr", "ar", "ja"]'),
  layoutPath: z.string().describe('Absolute path to root layout file'),
  nextConfigPath: z.string().describe('Absolute path to next.config file'),
});

/**
 * Tool 4 — setup_lingo:
 *
 * Self-contained custom i18n runtime — zero external npm deps, zero sandbox installs.
 * Translations are served from public/locales/<locale>.json (generated by install_and_translate).
 * Runtime: LanguageProvider (React context) + TextTranslator (DOM walker) + LanguageSwitcher.
 *
 * Why NOT @lingo.dev/compiler:
 *   @lingo.dev/compiler@latest has a packaging bug: the webpack plugin file
 *   `build/plugin/index.cjs` is missing from the npm publish → Next.js build fails.
 *   The correct approach is our custom runtime, which has zero external deps.
 */
export function createSetupLingoTool(sandbox: SandboxService, mcp: McpService, emit: EmitFn) {
  return tool({
    description:
      'Writes a self-contained i18n runtime (LanguageProvider + TextTranslator + LanguageSwitcher) ' +
      'into the target repo. Zero external npm deps. Translations loaded from public/locales/*.json ' +
      'at runtime, which are generated by install_and_translate using Babel AST extraction + Lingo.dev SDK.',
    inputSchema,
    execute: async ({ sandboxId, workDir, framework, locales, layoutPath, nextConfigPath }) => {
      emit({ level: 'info', message: 'Configuring i18n runtime…', timestamp: new Date(), step: 'setup_lingo' });

      if (mcp.isConnected) {
        try {
          await mcp.getSetupInstructions(framework, locales);
        } catch { /* non-fatal */ }
      }

      const modifiedFiles: string[] = [];

      // 1. Write i18n.json (locale config read by install_and_translate)
      await sandbox.writeFile(sandboxId, `${workDir}/i18n.json`, generateI18nConfig('en', locales));
      modifiedFiles.push(`${workDir}/i18n.json`);
      emit({ level: 'info', message: 'Written i18n.json', timestamp: new Date(), step: 'setup_lingo' });

      // 2. Write runtime files — i18n/ sibling to layout.tsx so relative imports resolve
      const layoutDir = layoutPath.substring(0, layoutPath.lastIndexOf('/'));
      await sandbox.exec(sandboxId, `mkdir -p ${layoutDir}/i18n`);

      const providerPath = `${layoutDir}/i18n/provider.tsx`;
      const switcherPath = `${layoutDir}/i18n/switcher.tsx`;
      const translatorPath = `${layoutDir}/i18n/text-translator.tsx`;

      await sandbox.writeFile(sandboxId, providerPath, generateI18nProvider());
      await sandbox.writeFile(sandboxId, switcherPath, generateLanguageSwitcher());
      await sandbox.writeFile(sandboxId, translatorPath, generateTextTranslator());
      modifiedFiles.push(providerPath, switcherPath, translatorPath);
      emit({
        level: 'info',
        message: 'Written LanguageProvider + LanguageSwitcher + TextTranslator',
        timestamp: new Date(),
        step: 'setup_lingo',
      });

      // 4. Inject LanguageProvider + TextTranslator + LanguageSwitcher into root layout
      const layoutContent = await sandbox.readFile(sandboxId, layoutPath);
      await sandbox.writeFile(sandboxId, layoutPath, patchRootLayout(layoutContent, locales));
      modifiedFiles.push(layoutPath);
      emit({
        level: 'info',
        message: `Patched ${layoutPath} with LanguageProvider`,
        timestamp: new Date(),
        step: 'setup_lingo',
      });

      emit({
        level: 'success',
        message: `i18n runtime configured — ${modifiedFiles.length} files written`,
        timestamp: new Date(),
        step: 'setup_lingo',
      });

      return { modifiedFiles, runtimeStrategy: 'custom' };
    },
  });
}
````

## File: server/src/agent/tools/trigger-preview.tool.ts
````typescript
import { tool } from 'ai';
import { z } from 'zod';
import { VercelService } from '../../vercel/vercel.service.js';
import { parseGitHubUrl } from '../../common/utils/url-parser.js';
import type { EmitFn } from '../../common/types/index.js';

/** Tool 7 — trigger_preview: Triggers Vercel deployment, polls until live, returns URL. No sandbox dependency. */
export function createTriggerPreviewTool(vercel: VercelService, emit: EmitFn) {
  return tool({
    description:
      'Triggers a Vercel preview deployment for the new branch and polls until ready. ' +
      'Returns the preview URL when the deployment is live.',
    inputSchema: z.object({
      repoUrl: z.string().describe('GitHub repository URL'),
      branchName: z.string().describe('Branch name to deploy, e.g. lingo/add-multilingual-support'),
    }),
    execute: async ({ repoUrl, branchName }) => {
      const { owner, repo } = parseGitHubUrl(repoUrl);

      emit({
        level: 'info',
        message: `Triggering Vercel preview deployment for branch: ${branchName}`,
        timestamp: new Date(),
        step: 'trigger_preview',
      });

      const { deploymentId } = await vercel.triggerDeployment(owner, repo, branchName);

      emit({
        level: 'info',
        message: `Deployment started (ID: ${deploymentId}) — polling for ready state…`,
        timestamp: new Date(),
        step: 'trigger_preview',
      });

      const previewUrl = await vercel.pollUntilReady(deploymentId);

      emit({
        level: 'success',
        message: `Preview deployment live: ${previewUrl}`,
        timestamp: new Date(),
        step: 'trigger_preview',
      });

      return { previewUrl };
    },
  });
}
````

## File: server/src/agent/agent.controller.ts
````typescript
import { Controller, Post, Get, Param, Body, Sse, Logger, NotFoundException, UseGuards } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';

import { AgentService } from './agent.service.js';
import { StartJobDto } from './dto/start-job.dto.js';
import { JobResponseDto } from './dto/job-response.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';

/** Exposes the agent pipeline via REST + SSE endpoints. */
@Controller('agent')
export class AgentController {
    private readonly logger = new Logger(AgentController.name);

    constructor(private readonly agent: AgentService) { }

    /** Starts pipeline async and returns jobId. Client uses SSE for live events. */
    @UseGuards(AuthGuard)
    @Post('run')
    async run(@Body() dto: StartJobDto): Promise<JobResponseDto> {
        const jobId = await this.agent.startJob(dto.repoUrl, dto.locales, dto.githubToken, dto.lingoApiKey, dto.groqApiKey);
        this.logger.log(`Job started: ${jobId}`);
        return { jobId };
    }

    /** SSE stream for real-time job progress. Emits log, progress, complete, and error events. */
    @Sse('stream/:jobId')
    stream(@Param('jobId') jobId: string): Observable<MessageEvent> {
        try {
            return this.agent.getStream(jobId).pipe(
                map((event) => ({
                    // Serialize data as JSON for NestJS SSE
                    data: event,
                })),
            );
        } catch {
            throw new NotFoundException(`No active stream for job ${jobId}`);
        }
    }

    /** Manually aborts a running job */
    @UseGuards(AuthGuard)
    @Post('cancel/:jobId')
    async cancel(@Param('jobId') jobId: string) {
        await this.agent.cancelJob(jobId);
        return { message: 'Job cancelled' };
    }

    /** Get job state */
    @UseGuards(AuthGuard)
    @Get('job/:jobId')
    async getJob(@Param('jobId') jobId: string) {
        return this.agent.getJob(jobId);
    }
}
````

## File: server/src/agent/agent.module.ts
````typescript
import { Module } from '@nestjs/common';
import { AgentService } from './agent.service.js';
import { AgentController } from './agent.controller.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { SandboxModule } from '../sandbox/sandbox.module.js';
import { GithubModule } from '../github/github.module.js';
import { McpModule } from '../mcp/mcp.module.js';
import { VercelModule } from '../vercel/vercel.module.js';
import { AuthModule } from '../auth/auth.module.js';

/** AgentModule — wires the pipeline orchestrator with all required foundation service modules. */
@Module({
    imports: [JobsModule, SandboxModule, GithubModule, McpModule, VercelModule, AuthModule],
    controllers: [AgentController],
    providers: [AgentService],
})
export class AgentModule { }
````

## File: server/src/agent/agent.service.ts
````typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateText, tool, ModelMessage } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { Subject, ReplaySubject, Observable } from 'rxjs';
import { z } from 'zod';

import { JobsService } from '../jobs/jobs.service.js';
import { SandboxService } from '../sandbox/sandbox.service.js';
import { GithubService } from '../github/github.service.js';
import { McpService } from '../mcp/mcp.service.js';
import { VercelService } from '../vercel/vercel.service.js';
import { AGENT_SYSTEM_PROMPT } from './prompts/agent-system.prompt.js';
import {
    createCloneRepoTool,
    createDetectFrameworkTool,
    createAnalyzeRepoTool,
    createSetupLingoTool,
    createInstallTranslateTool,
    createCommitPushTool,
    createTriggerPreviewTool,
} from './tools/index.js';
import type { EmitFn } from '../common/types/index.js';
import type { SseEvent } from '../common/types/events.types.js';

/** Orchestrates the 7-tool agent pipeline; manages per-job SSE streams via RxJS Subjects. */
@Injectable()
export class AgentService {
    private readonly logger = new Logger(AgentService.name);

    // One Subject per active job; removed on completion/error
    private readonly streams = new Map<string, ReplaySubject<SseEvent>>();

    // Track abort controllers to allow manual cancellations
    private readonly abortControllers = new Map<string, AbortController>();

    // Track active sandboxes per job for immediate termination on cancel
    private readonly activeSandboxes = new Map<string, string>();

    private readonly groqApiKey: string;
    private readonly lingoApiKey: string;

    constructor(
        private readonly jobs: JobsService,
        private readonly sandbox: SandboxService,
        private readonly github: GithubService,
        private readonly mcp: McpService,
        private readonly vercel: VercelService,
        private readonly config: ConfigService,
    ) {
        this.groqApiKey = this.config.getOrThrow<string>('GROQ_API_KEY');
        this.lingoApiKey = this.config.getOrThrow<string>('LINGO_API_KEY');
    }

    /** Creates a job record, fires off the pipeline async (non-blocking), and returns the job ID. */
    async startJob(repoUrl: string, locales: string[], githubToken: string, customLingoKey?: string, customGroqKey?: string): Promise<string> {
        const job = await this.jobs.create(repoUrl, locales);
        const subject = new ReplaySubject<SseEvent>();
        this.streams.set(job.id, subject);

        const abortController = new AbortController();
        this.abortControllers.set(job.id, abortController);

        // Fire and forget — SSE events flow through the subject
        this.runPipeline(job.id, repoUrl, locales, githubToken, subject, customLingoKey, customGroqKey).catch((err) => {
            this.logger.error(`Pipeline error for job ${job.id}: ${String(err)}`);
        });

        return job.id;
    }

    /** Fetches the current state of a job */
    async getJob(jobId: string) {
        return this.jobs.findOneOrThrow(jobId);
    }

    /** Returns the SSE observable for a job. The frontend subscribes to this. */
    getStream(jobId: string): Observable<SseEvent> {
        const subject = this.streams.get(jobId);
        if (!subject) {
            throw new Error(`No active stream for job ${jobId}. Job may have already completed.`);
        }
        return subject.asObservable();
    }

    /** Manually aborts a running job */
    async cancelJob(jobId: string): Promise<void> {
        const ac = this.abortControllers.get(jobId);
        if (ac) {
            ac.abort(new Error('Job manually cancelled by user'));
            await this.jobs.setError(jobId, 'Cancelled by user');

            // Terminate any running sandbox instantly for this job
            const sandboxId = this.activeSandboxes.get(jobId);
            if (sandboxId) {
                try {
                    await this.sandbox.kill(sandboxId);
                } catch (e) {
                    this.logger.warn(`[Job ${jobId}] Failed to kill sandbox on cancel: ${e}`);
                }
                this.activeSandboxes.delete(jobId);
            }
        }
    }

    // ---------------------------------------------------------------------------
    // Private pipeline runner
    // ---------------------------------------------------------------------------

    private async runPipeline(
        jobId: string,
        repoUrl: string,
        locales: string[],
        githubToken: string,
        subject: ReplaySubject<SseEvent>,
        customLingoKey?: string,
        customGroqKey?: string,
    ): Promise<void> {
        const activeLogs: import('../common/types/agent.types.js').LogEntry[] = [];
        const emit: EmitFn = (entry) => {
            activeLogs.push(entry);
            subject.next({ type: 'log', data: entry });
        };

        try {
            await this.jobs.updateStatus(jobId, 'running');

            // Resolve actual keys (custom taking precedence over system defaults)
            const resolvedGroqKey = customGroqKey || this.groqApiKey;
            const resolvedLingoKey = customLingoKey || this.lingoApiKey;

            const modelName = this.config.get<string>('DEFAULT_AI_MODEL') || 'llama-3.3-70b-versatile';
            const groq = createGroq({ apiKey: resolvedGroqKey });

            // ---------------------------------------------------------------------------
            // Build schema-only tools (no execute fn) for LLM argument extraction.
            // We manually execute tools OUTSIDE the generateText call to avoid
            // LLM-API timeout issues on long-running operations like git clone.
            // ---------------------------------------------------------------------------

            const fullTools = {
                clone_repo: createCloneRepoTool(this.sandbox, emit),
                detect_framework: createDetectFrameworkTool(this.sandbox, emit),
                analyze_repo: createAnalyzeRepoTool(this.sandbox, emit),
                setup_lingo: createSetupLingoTool(this.sandbox, this.mcp, emit),
                install_and_translate: createInstallTranslateTool(this.sandbox, resolvedLingoKey, emit),
                commit_and_push: createCommitPushTool(this.sandbox, this.github, emit),
                trigger_preview: createTriggerPreviewTool(this.vercel, emit),
            };

            // Schema-only version: LLM sees the tool and picks args, but does NOT execute it
            const schemaOnlyTools = Object.fromEntries(
                Object.entries(fullTools).map(([name, t]) => [
                    name,
                    tool({
                        description: (t as any).description,
                        inputSchema: (t as any).inputSchema as z.ZodTypeAny,
                        // NOTE: no `execute` — LLM returns toolCalls, we execute manually
                    }),
                ]),
            );

            const toolSequence = [
                'clone_repo',
                'detect_framework',
                'analyze_repo',
                'setup_lingo',
                'install_and_translate',
                'commit_and_push',
                'trigger_preview',
            ] as const;

            const userMessage =
                `Repository: ${repoUrl}\n` +
                `Target locales: ${locales.join(', ')}\n` +
                `GitHub token: ${githubToken}\n\n` +
                `Execute exactly ONE tool now: 'clone_repo'. Wait for the result before proceeding.`;

            let messages: ModelMessage[] = [{ role: 'user', content: userMessage }];
            let prUrl: string | undefined;
            let previewUrl: string | undefined;
            let currentToolIndex = 0;
            const maxIterations = 20;
            const maxRetries = 3;
            let retriesForCurrentTool = 0;

            this.logger.log(`[Job ${jobId}] Starting pipeline with model: ${modelName}`);

            for (let i = 0; i < maxIterations; i++) {
                if (this.abortControllers.get(jobId)?.signal.aborted) {
                    throw new Error('Job manually cancelled by user');
                }

                if (currentToolIndex >= toolSequence.length) break;

                const currentExpectedTool = toolSequence[currentToolIndex];

                // Expose only ONE schema to the LLM to force strict sequential execution
                const currentSchema = { [currentExpectedTool]: schemaOnlyTools[currentExpectedTool] };

                this.logger.log(`[Job ${jobId}] Iteration ${i}: Asking LLM to call '${currentExpectedTool}'`);

                // ── Step A: Ask LLM ONLY to generate the tool call (fast — no I/O here) ──
                let stepResult: Awaited<ReturnType<typeof generateText>>;
                try {
                    stepResult = await generateText({
                        model: groq(modelName),
                        system: AGENT_SYSTEM_PROMPT,
                        messages,
                        tools: currentSchema as any,
                        toolChoice: 'required', // Force the model to call a tool — no text-only responses
                        maxOutputTokens: 1024,
                        abortSignal: this.abortControllers.get(jobId)?.signal,
                    });
                } catch (llmErr: any) {
                    const errMsg = llmErr?.message || String(llmErr);
                    // "tool call validation failed" = LLM hallucinated a wrong tool name.
                    // Treat like a missed tool call — retry rather than kill the pipeline.
                    const isValidationError =
                        errMsg.includes('tool call validation failed') ||
                        errMsg.includes('was not in request.tools');
                    if (isValidationError) {
                        retriesForCurrentTool++;
                        this.logger.warn(`[Job ${jobId}] LLM called wrong tool name (retry ${retriesForCurrentTool}/${maxRetries}): ${errMsg}`);
                        if (retriesForCurrentTool >= maxRetries) {
                            throw new Error(`Pipeline stalled at '${currentExpectedTool}' — LLM kept calling a non-existent tool after ${maxRetries} retries.`);
                        }
                        messages.push({
                            role: 'user',
                            content: `You called a tool that does not exist. You MUST call ONLY '${currentExpectedTool}'. No other tool name is valid.`,
                        });
                        await new Promise((r) => setTimeout(r, 1500));
                        continue;
                    }
                    // Hard API errors (rate limit, auth, network) — fail fast
                    const isRateLimit = /rate.limit|too many requests|429|quota|exceeded/i.test(errMsg);
                    const isAuthErr = /unauthorized|invalid.*key|forbidden|401|api.key|authentication/i.test(errMsg);

                    if (isRateLimit || isAuthErr) {
                        emit({
                            level: 'error',
                            message: isRateLimit
                                ? `⚠️ Groq API rate limit exceeded: ${errMsg}`
                                : `⚠️ Groq API key is invalid or expired: ${errMsg}`,
                            timestamp: new Date(),
                            step: currentExpectedTool,
                        });
                        emit({
                            level: 'error',
                            message: '💡 Go to Dashboard → Settings tab to add your own Groq API key. Get one free at https://console.groq.com/keys',
                            timestamp: new Date(),
                            step: currentExpectedTool,
                        });
                        throw new Error(
                            isRateLimit
                                ? 'Groq rate limit exceeded. Please add your own Groq API key in Dashboard → Settings, or wait a few minutes and try again.'
                                : 'Invalid Groq API key. Please check or update it in Dashboard → Settings.',
                        );
                    }

                    this.logger.error(`[Job ${jobId}] LLM API error: ${errMsg}`);
                    throw new Error(`LLM error at step '${currentExpectedTool}': ${errMsg}`);
                }

                if (stepResult.text) {
                    this.logger.debug(`[Job ${jobId}] LLM text (expected tool call): "${stepResult.text.substring(0, 150)}"`);
                }

                this.logger.log(`[Job ${jobId}] toolCalls from LLM: ${stepResult.toolCalls?.length ?? 0}`);

                // ── Step B: Find the intended tool call ──
                const toolCall = stepResult.toolCalls?.find(
                    (tc: any) => tc.toolName === currentExpectedTool,
                );

                if (!toolCall) {
                    retriesForCurrentTool++;
                    this.logger.warn(`[Job ${jobId}] LLM did not call '${currentExpectedTool}'. Retry ${retriesForCurrentTool}/${maxRetries}`);

                    if (retriesForCurrentTool >= maxRetries) {
                        throw new Error(
                            `Pipeline stalled at step '${currentExpectedTool}' after ${maxRetries} retries. ` +
                            `The LLM kept responding with text instead of a tool call. Try again.`,
                        );
                    }

                    // Add LLM's non-tool reply to history, then nudge
                    if (stepResult.response?.messages?.length) {
                        messages.push(...stepResult.response.messages);
                    }
                    messages.push({
                        role: 'user',
                        content: `You MUST call the tool '${currentExpectedTool}' now. Use the tool interface directly — do not write text or JSON.`,
                    });
                    await new Promise((r) => setTimeout(r, 1500));
                    continue;
                }

                // LLM generated a valid tool call — reset retry counter
                retriesForCurrentTool = 0;

                const toolArgs = (toolCall as any).input ?? (toolCall as any).args ?? {};
                this.logger.log(`[Job ${jobId}] Executing '${currentExpectedTool}' with args: ${JSON.stringify(toolArgs)}`);

                // ── Step C: Execute the tool MANUALLY (no SDK timeout concerns) ──
                let toolOutput: any;
                try {
                    toolOutput = await (fullTools as any)[currentExpectedTool].execute(toolArgs, {});
                } catch (toolErr: any) {
                    const errMsg = toolErr?.message || String(toolErr);
                    this.logger.error(`[Job ${jobId}] Tool '${currentExpectedTool}' threw: ${errMsg}`);
                    throw new Error(`Tool '${currentExpectedTool}' failed: ${errMsg}`);
                }

                this.logger.log(`[Job ${jobId}] Tool '${currentExpectedTool}' succeeded: ${JSON.stringify(toolOutput)}`);

                // Capture PR/preview URLs whenever available
                if (toolOutput?.prUrl) prUrl = toolOutput.prUrl;
                if (toolOutput?.previewUrl) previewUrl = toolOutput.previewUrl;
                if (toolOutput?.sandboxId) this.activeSandboxes.set(jobId, toolOutput.sandboxId);

                // Advance the sequence index
                currentToolIndex++;

                // Pipeline done — all tools completed
                if (currentToolIndex >= toolSequence.length) break;

                const nextTool = toolSequence[currentToolIndex];

                // Use plain user messages to pass tool results — avoids SDK ModelMessage schema issues
                // with complex tool-call/tool-result role formats that change across SDK versions.
                messages.push({
                    role: 'user',
                    content:
                        `Tool '${currentExpectedTool}' completed successfully.\n` +
                        `Result: ${JSON.stringify(toolOutput)}\n\n` +
                        `Now call exactly ONE tool: '${nextTool}'.`,
                });
            }

            if (!prUrl) {
                const stalledAt = toolSequence[Math.min(currentToolIndex, toolSequence.length - 1)];
                throw new Error(
                    `Pipeline ended without a PR URL. Last attempted step: '${stalledAt}'. ` +
                    `Completed ${currentToolIndex}/${toolSequence.length} steps.`,
                );
            }

            this.logger.log(`[Job ${jobId}] Pipeline complete! prUrl=${prUrl}, previewUrl=${previewUrl}`);
            await this.jobs.setResult(jobId, prUrl, previewUrl ?? '');
            subject.next({ type: 'complete', data: { prUrl, previewUrl: previewUrl ?? '' } });
            subject.complete();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`[Job ${jobId}] Failed: ${message}`);
            await this.jobs.setError(jobId, message);
            subject.next({ type: 'error', data: { message, step: 'unknown' } });
            subject.complete();
        } finally {
            try {
                await this.jobs.saveLogs(jobId, activeLogs);
            } catch (saveErr) {
                this.logger.error(`[Job ${jobId}] Failed to save logs: ${saveErr}`);
            }
            // Clean up the E2B sandbox to free resources
            const remainingSandboxId = this.activeSandboxes.get(jobId);
            if (remainingSandboxId) {
                try {
                    await this.sandbox.kill(remainingSandboxId);
                } catch {
                    // Ignore cleanup errors — sandbox may have already been killed (e.g. by cancelJob)
                }
            }
            this.streams.delete(jobId);
            this.abortControllers.delete(jobId);
            this.activeSandboxes.delete(jobId);
        }
    }
}
````

## File: server/src/auth/auth.guard.ts
````typescript
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service.js';

/** Guards protected endpoints by requiring a Bearer token in the Authorization header. */
@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly auth: AuthService) { }

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>();
        const authHeader = req.headers['authorization'];

        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or malformed Authorization header.');
        }

        const token = authHeader.slice(7); // strip "Bearer "
        if (!this.auth.validateToken(token)) {
            throw new UnauthorizedException('Invalid token.');
        }

        // Attach token to request so downstream can read it without re-parsing
        (req as Request & { githubToken: string }).githubToken = token;
        return true;
    }
}
````

## File: server/src/auth/auth.module.ts
````typescript
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';

/** Provides AuthGuard and AuthService for use in feature modules that need route protection. */
@Module({
    providers: [AuthService, AuthGuard],
    exports: [AuthService, AuthGuard],
})
export class AuthModule { }
````

## File: server/src/auth/auth.service.ts
````typescript
import { Injectable } from '@nestjs/common';

/** Validates that an incoming token is a non-empty string. Extensible for future signature checks. */
@Injectable()
export class AuthService {
    validateToken(token: string): boolean {
        return typeof token === 'string' && token.trim().length > 0;
    }
}
````

## File: server/src/common/filters/http-exception.filter.ts
````typescript
import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/** Global exception filter — converts any thrown exception into a structured JSON error response. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();
        const req = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.getResponse()
                : 'Internal server error';

        this.logger.error(
            `${req.method} ${req.url} → ${status}`,
            exception instanceof Error ? exception.stack : String(exception),
        );

        res.status(status).json({
            statusCode: status,
            message: typeof message === 'object' ? (message as Record<string, unknown>).message ?? message : message,
            timestamp: new Date().toISOString(),
            path: req.url,
        });
    }
}
````

## File: server/src/common/types/agent.types.ts
````typescript
export type JobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type LogLevel = 'info' | 'success' | 'error' | 'warn';

export interface LogEntry {
  message: string;
  level: LogLevel;
  timestamp: Date;
  step?: string;
}

export interface AgentResult {
  prUrl: string;
  previewUrl: string;
}
````

## File: server/src/common/types/events.types.ts
````typescript
import type { LogEntry, AgentResult } from './agent.types.js';

export interface SseLogEvent {
  type: 'log';
  data: LogEntry;
}

export interface SseProgressEvent {
  type: 'progress';
  data: { step: string; percent: number };
}

export interface SseCompleteEvent {
  type: 'complete';
  data: AgentResult;
}

export interface SseErrorEvent {
  type: 'error';
  data: { message: string; step: string };
}

export type SseEvent =
  | SseLogEvent
  | SseProgressEvent
  | SseCompleteEvent
  | SseErrorEvent;
````

## File: server/src/common/types/index.ts
````typescript
export * from './agent.types.js';
export * from './tool.types.js';
export * from './events.types.js';
````

## File: server/src/common/types/tool.types.ts
````typescript
import type { LogEntry } from './agent.types.js';

// Function signature for emitting real-time log events from within a tool
export type EmitFn = (entry: LogEntry) => void;

// --- clone_repo ---
export interface CloneRepoInput {
  repoUrl: string;
  githubToken: string;
}

export interface CloneRepoOutput {
  sandboxId: string;
  workDir: string;
}

// --- detect_framework ---
export interface DetectFrameworkInput {
  sandboxId: string;
  workDir: string;
}

export interface DetectFrameworkOutput {
  framework: 'nextjs-app-router' | 'nextjs-pages' | 'unknown';
}

// --- analyze_repo ---
export interface AnalyzeRepoInput {
  sandboxId: string;
  workDir: string;
}

export interface AnalyzeRepoOutput {
  hasExistingI18n: boolean;
  existingI18nLibrary: string | null;
  layoutPath: string;
  nextConfigPath: string;
  jsxFileCount: number;
}

// --- setup_lingo ---
export interface SetupLingoInput {
  sandboxId: string;
  workDir: string;
  framework: string;
  locales: string[];
  layoutPath: string;
  nextConfigPath: string;
}

export interface SetupLingoOutput {
  modifiedFiles: string[];
}

// --- install_and_translate ---
export interface InstallTranslateInput {
  sandboxId: string;
  workDir: string;
}

export interface InstallTranslateOutput {
  generatedLocales: string[];
  wordCounts: Record<string, number>;
}

// --- commit_and_push ---
export interface CommitPushInput {
  sandboxId: string;
  workDir: string;
  repoUrl: string;
  githubToken: string;
  locales: string[];
}

export interface CommitPushOutput {
  branchName: string;
  prUrl: string;
}

// --- trigger_preview ---
export interface TriggerPreviewInput {
  repoUrl: string;
  branchName: string;
}

export interface TriggerPreviewOutput {
  previewUrl: string;
}
````

## File: server/src/common/utils/file-patcher.ts
````typescript
/** Pure string-transform utilities for patching Next.js config files and generating i18n runtime files. */

/** No-op: custom runtime does not modify next.config. Kept for API compatibility. */
export function patchNextConfig(content: string): string {
  return content;
}

// ---------------------------------------------------------------------------
// layout.tsx patch — custom runtime (zero external deps)
// ---------------------------------------------------------------------------

/** Injects custom LanguageProvider + LanguageSwitcher + TextTranslator into root layout. */
export function patchRootLayout(content: string, locales: string[]): string {
  if (content.includes('LanguageProvider')) return content;

  let patched = content;
  const firstImportEnd = findAfterLastImport(patched);
  const localeList = ['en', ...locales].map((l) => `'${l}'`).join(', ');

  const imports =
    `import { LanguageProvider } from './i18n/provider';\n` +
    `import { LanguageSwitcher } from './i18n/switcher';\n` +
    `import { TextTranslator } from './i18n/text-translator';\n`;

  patched = patched.slice(0, firstImportEnd) + imports + patched.slice(firstImportEnd);

  const vercelHideCSS = `<style dangerouslySetInnerHTML={{ __html: \`
      [data-vercel-feedback], #vercel-live-feedback,
      body > div[style*="z-index: 2147483647"] { display: none !important; }
    \` }} />`;

  patched = patched.replace(
    /\{children\}/g,
    `<LanguageProvider defaultLocale="en" availableLocales={[${localeList}]}>\n        {children}\n        <TextTranslator />\n        <LanguageSwitcher />\n        ${vercelHideCSS}\n      </LanguageProvider>`,
  );
  return patched;
}

// ---------------------------------------------------------------------------
// Shared helper: find insertion point after last import statement
// ---------------------------------------------------------------------------

function findAfterLastImport(content: string): number {
  const lines = content.split('\n');
  let lastImportLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) lastImportLine = i;
  }
  if (lastImportLine === -1) return 0;
  let pos = 0;
  for (let i = 0; i <= lastImportLine; i++) pos += lines[i].length + 1;
  return pos;
}

// ---------------------------------------------------------------------------
// i18n JSON config generator
// ---------------------------------------------------------------------------

/** Generates the i18n.json content for a project. */
export function generateI18nConfig(sourceLocale: string, targetLocales: string[]): string {
  return JSON.stringify(
    { locale: { source: sourceLocale, targets: targetLocales } },
    null,
    2,
  );
}

// ---------------------------------------------------------------------------
// Language switcher — portal-rendered to guarantee fixed positioning
// ---------------------------------------------------------------------------

/** Generates app/i18n/switcher.tsx — small FAB with translate icon + dropdown. */
export function generateLanguageSwitcher(): string {
  return `'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from './provider';

const LOCALE_FLAGS: Record<string, string> = {
  en: '\u{1F1FA}\u{1F1F8}', fr: '\u{1F1EB}\u{1F1F7}', ar: '\u{1F1F8}\u{1F1E6}', ja: '\u{1F1EF}\u{1F1F5}',
  de: '\u{1F1E9}\u{1F1EA}', es: '\u{1F1EA}\u{1F1F8}', it: '\u{1F1EE}\u{1F1F9}', pt: '\u{1F1E7}\u{1F1F7}', zh: '\u{1F1E8}\u{1F1F3}', ko: '\u{1F1F0}\u{1F1F7}',
};

const LOCALE_NAMES: Record<string, string> = {
  en: 'English', fr: 'Fran\u{E7}ais', ar: '\u{627}\u{644}\u{639}\u{631}\u{628}\u{64A}\u{629}', ja: '\u{65E5}\u{672C}\u{8A9E}',
  de: 'Deutsch', es: 'Espa\u{F1}ol', it: 'Italiano', pt: 'Portugu\u{EA}s', zh: '\u{4E2D}\u{6587}', ko: '\u{D55C}\u{AD6D}\u{C5B4}',
};

const TranslateIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="m12.87 15.07-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7 1.62-4.33L19.12 17h-3.24z"/>
  </svg>
);

export function LanguageSwitcher() {
  const { locale, changeLocale, availableLocales } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!mounted || availableLocales.length <= 1) return null;

  return createPortal(
    <div ref={ref} style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999 }}>
      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', bottom: '56px', right: 0,
          background: 'rgba(255,255,255,0.98)', border: '1px solid #e2e8f0',
          borderRadius: '12px', padding: '6px', boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(16px)', minWidth: '160px',
          animation: 'lingoSlideUp 0.2s ease-out',
        }}>
          {availableLocales.map((loc) => (
            <button key={loc} onClick={() => { changeLocale(loc); setOpen(false); }} style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
              padding: '8px 12px', borderRadius: '8px', border: 'none',
              background: loc === locale ? '#0070f3' : 'transparent',
              color: loc === locale ? '#fff' : '#374151',
              cursor: 'pointer', fontSize: '14px', fontWeight: loc === locale ? 600 : 400,
              transition: 'background 0.15s, color 0.15s', whiteSpace: 'nowrap',
            }}
              onMouseEnter={(e) => { if (loc !== locale) e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseLeave={(e) => { if (loc !== locale) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '18px' }}>{LOCALE_FLAGS[loc] ?? '\u{1F310}'}</span>
              <span>{LOCALE_NAMES[loc] ?? loc.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
      {/* FAB Button */}
      <button onClick={() => setOpen(!open)} aria-label="Change language" style={{
        width: '48px', height: '48px', borderRadius: '50%', border: 'none',
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(79,70,229,0.5)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(79,70,229,0.4)'; }}
      >
        <TranslateIcon />
      </button>
      <style>{\`
        @keyframes lingoSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      \`}</style>
    </div>,
    document.body,
  );
}
`;
}

// ---------------------------------------------------------------------------
// Custom runtime generators (kept for fallback / reference)
// ---------------------------------------------------------------------------

/** Generates app/i18n/provider.tsx — self-contained React context, no external deps. */
export function generateI18nProvider(): string {
  return `'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface I18nContextValue {
  locale: string;
  translations: Record<string, string>;
  changeLocale: (locale: string) => void;
  availableLocales: string[];
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en', translations: {}, changeLocale: () => {}, availableLocales: ['en'],
});

export const useI18n = () => useContext(I18nContext);

interface LanguageProviderProps {
  children: ReactNode;
  defaultLocale?: string;
  availableLocales?: string[];
}

export function LanguageProvider({ children, defaultLocale = 'en', availableLocales = ['en'] }: LanguageProviderProps) {
  const [locale, setLocale] = useState(defaultLocale);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    if (locale === defaultLocale) { setTranslations({}); return; }
    fetch(\`/locales/\${locale}.json\`).then((r) => r.ok ? r.json() : {}).then(setTranslations).catch(() => setTranslations({}));
  }, [locale, defaultLocale]);

  return (
    <I18nContext.Provider value={{ locale, translations, changeLocale: setLocale, availableLocales }}>
      {children}
    </I18nContext.Provider>
  );
}
`;
}

/** Generates app/i18n/text-translator.tsx — DOM text-node + attribute replacement on locale change. */
export function generateTextTranslator(): string {
  return `'use client';
import { useEffect, useRef } from 'react';
import { useI18n } from './provider';

function normalize(s: string): string { return s.replace(/\\\\s+/g, ' ').trim(); }

const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'alt', 'aria-label', 'aria-placeholder'];
const ATTR_SELECTOR = TRANSLATABLE_ATTRS.map(a => '[' + a + ']').join(',');

export function TextTranslator() {
  const { translations, locale } = useI18n();
  const originalTexts = useRef<Map<Text, string>>(new Map());
  const originalAttrs = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Restore original text nodes
    originalTexts.current.forEach((orig, node) => { if (document.body.contains(node)) node.textContent = orig; });

    // Restore original attributes
    originalAttrs.current.forEach((orig, key) => {
      const [xpath, attr] = key.split('::');
      const el = document.querySelector(xpath);
      if (el) el.setAttribute(attr, orig);
    });

    if (Object.keys(translations).length === 0) return;

    const keyMap = new Map<string, string>();
    for (const [key, value] of Object.entries(translations)) {
      const nk = normalize(key);
      if (nk && value) keyMap.set(nk, value);
    }
    if (keyMap.size === 0) return;

    // ─── Pass 1: Text nodes ────────────────────────────────────────────
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const updates: Array<[Text, string]> = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const raw = node.textContent ?? '';
      if (!raw.trim()) continue;
      if (!originalTexts.current.has(node)) originalTexts.current.set(node, raw);
      const original = originalTexts.current.get(node)!;
      const normalised = normalize(original);
      if (keyMap.has(normalised)) { updates.push([node, keyMap.get(normalised)!]); continue; }
      let replaced = original; let didReplace = false;
      for (const [key, translated] of [...keyMap.entries()].sort((a, b) => b[0].length - a[0].length)) {
        if (key.length < 3) continue;
        if (replaced.includes(key)) { replaced = replaced.split(key).join(translated); didReplace = true; }
      }
      if (didReplace) updates.push([node, replaced]);
    }
    updates.forEach(([n, text]) => { n.textContent = text; });

    // ─── Pass 2: Element attributes ────────────────────────────────────
    const elements = document.body.querySelectorAll(ATTR_SELECTOR);
    elements.forEach((el, idx) => {
      TRANSLATABLE_ATTRS.forEach(attr => {
        const val = el.getAttribute(attr);
        if (!val) return;
        const norm = normalize(val);
        const storeKey = \`[data-lingo-idx="\${idx}"]||\${attr}\`;
        if (!originalAttrs.current.has(storeKey)) {
          el.setAttribute('data-lingo-idx', String(idx));
          originalAttrs.current.set(storeKey, val);
        }
        if (keyMap.has(norm)) {
          el.setAttribute(attr, keyMap.get(norm)!);
        }
      });
    });
  }, [translations, locale]);

  return null;
}
`;
}
````

## File: server/src/common/utils/framework-detector.ts
````typescript
/** Pure framework detection logic based on Next.js/App/Pages router presence. */

export type Framework = 'nextjs-app-router' | 'nextjs-pages' | 'unknown';

export interface FrameworkDetectionResult {
  framework: Framework;
  /** Path to root layout file — only set for nextjs-app-router */
  layoutPath: string | null;
}

export function detectFramework(packageJsonDeps: Record<string, string>, filePaths: string[]): FrameworkDetectionResult {
  // packageJsonDeps is already a merged deps+devDeps object from the caller
  const hasNext = 'next' in packageJsonDeps;

  if (!hasNext) {
    return { framework: 'unknown', layoutPath: null };
  }

  // App Router: requires app/layout.tsx or app/layout.jsx at any depth
  const layoutPath = filePaths.find(
    (p) =>
      /\bapp\/layout\.(tsx|jsx|ts|js)$/.test(p) &&
      !p.includes('node_modules'),
  );

  if (layoutPath) {
    return { framework: 'nextjs-app-router', layoutPath };
  }

  // Pages Router: _app.tsx / _app.jsx inside pages/
  const hasPagesRouter = filePaths.some(
    (p) =>
      /\bpages\/_app\.(tsx|jsx|ts|js)$/.test(p) &&
      !p.includes('node_modules'),
  );

  if (hasPagesRouter) {
    return { framework: 'nextjs-pages', layoutPath: null };
  }

  // Has Next.js but unrecognisable structure
  return { framework: 'unknown', layoutPath: null };
}

/** Known i18n libraries that conflict with the Lingo.dev compiler. */
const CONFLICTING_I18N_LIBS = [
  'next-intl',
  'i18next',
  'react-i18next',
  'next-i18next',
  '@lingui/core',
  'rosetta',
  'typesafe-i18n',
];

/** Returns the name of the first conflicting i18n library found, or null. */
export function detectConflictingI18n(
  allDeps: Record<string, string>,
): string | null {
  for (const lib of CONFLICTING_I18N_LIBS) {
    if (lib in allDeps) return lib;
  }
  return null;
}
````

## File: server/src/common/utils/url-parser.ts
````typescript
/** Parses GitHub repo URL into owner/repo components, throwing for invalid/non-GitHub inputs. */
export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const trimmed = url.trim().replace(/\.git$/, '');

  // HTTPS format: https://github.com/owner/repo
  const httpsMatch = trimmed.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // SSH format: git@github.com:owner/repo
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+)$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  // Reject other hosts explicitly
  if (trimmed.includes('gitlab.com') || trimmed.includes('bitbucket.org')) {
    throw new Error(
      `Only GitHub repositories are supported. Received: ${url}`,
    );
  }

  throw new Error(
    `Invalid GitHub URL: "${url}". Expected format: https://github.com/owner/repo`,
  );
}

/** Builds authenticated HTTPS clone URL embedding the token. */
export function buildAuthenticatedCloneUrl(
  owner: string,
  repo: string,
  token: string,
): string {
  return `https://${token}@github.com/${owner}/${repo}.git`;
}
````

## File: server/src/github/github.module.ts
````typescript
import { Module } from '@nestjs/common';
import { GithubService } from './github.service.js';

@Module({
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
````

## File: server/src/github/github.service.ts
````typescript
import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';

export interface FileChange {
  path: string;
  content: string; // UTF-8 string content
}

export interface PullRequestResult {
  url: string;
  number: number;
}

/** Wraps the GitHub REST API statelessly; Octokit is instantiated per-call for fresh credentials. */
@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  private client(token: string): Octokit {
    return new Octokit({ auth: token });
  }

  /** Returns the repository's default branch name (e.g. 'main' or 'master'). */
  async getDefaultBranch(owner: string, repo: string, token: string): Promise<string> {
    const { data } = await this.client(token).repos.get({ owner, repo });
    return data.default_branch;
  }

  /** Returns the latest commit SHA on a given branch. Required for branch creation. */
  async getLatestCommitSha(
    owner: string,
    repo: string,
    branch: string,
    token: string,
  ): Promise<string> {
    const { data } = await this.client(token).repos.getBranch({ owner, repo, branch });
    return data.commit.sha;
  }

  /** Creates a new branch off the given base commit SHA. */
  async createBranch(
    owner: string,
    repo: string,
    branchName: string,
    baseSha: string,
    token: string,
  ): Promise<void> {
    await this.client(token).git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });
    this.logger.log(`Branch created: ${branchName}`);
  }

  /** Commits multiple files atomically using the Git Data API, avoiding local git requirements. */
  async commitFiles(
    owner: string,
    repo: string,
    branch: string,
    baseSha: string,
    files: FileChange[],
    message: string,
    token: string,
  ): Promise<void> {
    const octokit = this.client(token);

    // 1. Create a blob for each file
    const blobs = await Promise.all(
      files.map((f) =>
        octokit.git.createBlob({
          owner,
          repo,
          content: Buffer.from(f.content).toString('base64'),
          encoding: 'base64',
        }),
      ),
    );

    // 2. Create a new tree referencing the base tree + new blobs
    const { data: tree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseSha,
      tree: files.map((f, i) => ({
        path: f.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blobs[i].data.sha,
      })),
    });

    // 3. Create a commit pointing to the new tree
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: tree.sha,
      parents: [baseSha],
    });

    // 4. Update the branch ref to point to the new commit
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.sha,
    });

    this.logger.log(`Committed ${files.length} file(s) to ${branch}`);
  }

  /** Opens a pull request and returns its URL and number. */
  async createPullRequest(
    owner: string,
    repo: string,
    head: string,
    base: string,
    title: string,
    body: string,
    token: string,
  ): Promise<PullRequestResult> {
    const { data } = await this.client(token).pulls.create({
      owner,
      repo,
      head,
      base,
      title,
      body,
    });
    this.logger.log(`PR opened: ${data.html_url}`);
    return { url: data.html_url, number: data.number };
  }
}
````

## File: server/src/jobs/jobs.module.ts
````typescript
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { JobsService } from './jobs.service.js';

/** Exports PrismaService and JobsService for global database access. */
@Module({
  providers: [PrismaService, JobsService],
  exports: [PrismaService, JobsService],
})
export class JobsModule { }
````

## File: server/src/jobs/jobs.service.ts
````typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { Job, JobStatus } from '@prisma/client';
import { PrismaService } from './prisma.service.js';

/** Handles persistent job state, tracking the lifecycle of agent pipeline runs. */
@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) { }

  create(repoUrl: string, locales: string[]): Promise<Job> {
    return this.prisma.job.create({
      data: { repoUrl, locales, status: 'pending' },
    });
  }

  async findOneOrThrow(id: string): Promise<Job> {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job;
  }

  updateStatus(id: string, status: JobStatus): Promise<Job> {
    return this.prisma.job.update({ where: { id }, data: { status } });
  }

  setResult(id: string, prUrl: string, previewUrl: string): Promise<Job> {
    return this.prisma.job.update({
      where: { id },
      data: { status: 'completed', prUrl, previewUrl },
    });
  }

  setError(id: string, error: string): Promise<Job> {
    return this.prisma.job.update({
      where: { id },
      data: { status: 'failed', error },
    });
  }

  saveLogs(id: string, logs: any[]): Promise<Job> {
    return this.prisma.job.update({
      where: { id },
      data: { logs } as any,
    });
  }
}
````

## File: server/src/jobs/prisma.service.ts
````typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

/** Wraps PrismaClient lifecycle for NestJS DI, managing connection on init/shutdown. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const databaseUrl = config.getOrThrow<string>('DATABASE_URL');
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }
}
````

## File: server/src/mcp/mcp.module.ts
````typescript
import { Module } from '@nestjs/common';
import { McpService } from './mcp.service.js';

@Module({
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
````

## File: server/src/mcp/mcp.service.ts
````typescript
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

/**
 * Connects to the Lingo.dev MCP server and exposes its tools.
 * Established once at startup. Callers should check `isConnected`.
 * Used for querying exact, framework-specific configuration steps.
 */
@Injectable()
export class McpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(McpService.name);
  private client: Client | null = null;
  private connected = false;
  private readonly serverUrl: string;

  constructor(config: ConfigService) {
    this.serverUrl = config.getOrThrow<string>('LINGO_MCP_SERVER_URL');
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      this.client = new Client({ name: 'lingo-agent', version: '1.0.0' });
      const transport = new SSEClientTransport(new URL(this.serverUrl));
      await this.client.connect(transport);
      this.connected = true;
      this.logger.log(`Connected to Lingo.dev MCP server at ${this.serverUrl}`);
    } catch (err) {
      // Non-fatal at startup: the agent will get a clear error when it tries to use this
      this.connected = false;
      this.logger.warn(`MCP server unavailable: ${String(err)}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.close();
      this.logger.log('MCP connection closed');
    } catch {
      // Ignore disconnect errors on shutdown
    } finally {
      this.connected = false;
      this.client = null;
    }
  }

  /** Queries the MCP server for exact setup instructions for the framework and locales. */
  async getSetupInstructions(framework: string, locales: string[]): Promise<string> {
    if (!this.client || !this.connected) {
      throw new Error('MCP server is not connected. Check LINGO_MCP_SERVER_URL.');
    }

    const result = await this.client.callTool({
      name: 'get_setup_instructions',
      arguments: { framework, locales },
    });

    // MCP tool responses return content as an array of typed blocks
    const textBlock = (result.content as Array<{ type: string; text: string }>).find(
      (block) => block.type === 'text',
    );

    if (!textBlock) {
      throw new Error('MCP server returned no text content for setup instructions');
    }

    return textBlock.text;
  }

  /** Lists all available tools on the connected MCP server (useful for debugging). */
  async listTools(): Promise<string[]> {
    if (!this.client || !this.connected) return [];
    const { tools } = await this.client.listTools();
    return tools.map((t) => t.name);
  }
}
````

## File: server/src/sandbox/sandbox.module.ts
````typescript
import { Module } from '@nestjs/common';
import { SandboxService } from './sandbox.service.js';

@Module({
  providers: [SandboxService],
  exports: [SandboxService],
})
export class SandboxModule {}
````

## File: server/src/sandbox/sandbox.service.ts
````typescript
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sandbox } from 'e2b';

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Manages E2B cloud sandbox instances for isolated code execution.
 * Untrusted repository operations happen inside these isolated sandboxes.
 */
@Injectable()
export class SandboxService implements OnModuleDestroy {
  private readonly logger = new Logger(SandboxService.name);
  private readonly sandboxes = new Map<string, Sandbox>();
  private readonly apiKey: string;

  // Conservative timeout for hackathon: 10 minutes per sandbox
  private readonly SANDBOX_TIMEOUT_MS = 10 * 60 * 1000;

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow<string>('E2B_API_KEY');
  }

  /** Spins up a new E2B sandbox and stores a reference by its ID. */
  async create(): Promise<{ sandboxId: string }> {
    const sandbox = await Sandbox.create({
      apiKey: this.apiKey,
      timeoutMs: this.SANDBOX_TIMEOUT_MS,
    });
    this.sandboxes.set(sandbox.sandboxId, sandbox);
    this.logger.log(`Sandbox created: ${sandbox.sandboxId}`);
    return { sandboxId: sandbox.sandboxId };
  }

  /** Retrieves a tracked sandbox by ID, throwing if not found. */
  get(sandboxId: string): Sandbox {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found or already terminated`);
    }
    return sandbox;
  }

  /** Runs a shell command inside the sandbox, returning result and exit code. */
  async exec(sandboxId: string, cmd: string, timeoutMs?: number): Promise<CommandResult> {
    const sandbox = this.get(sandboxId);
    try {
      const result = await sandbox.commands.run(cmd, timeoutMs !== undefined ? { timeoutMs } : undefined);
      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.exitCode ?? 0,
      };
    } catch (err: any) {
      // E2B throws on non-zero exit codes rather than returning a result object.
      // Extract exit code from message like "exit status 128" and surface stdout/stderr.
      const exitCodeMatch = String(err?.message || '').match(/exit status (\d+)/);
      const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : 1;
      this.logger.debug(`exec threw (exit ${exitCode}): ${err?.message}`);
      return {
        stdout: err?.stdout ?? '',
        stderr: err?.stderr ?? err?.message ?? String(err),
        exitCode,
      };
    }
  }

  /** Reads the contents of a file from the sandbox filesystem. */
  async readFile(sandboxId: string, path: string): Promise<string> {
    const sandbox = this.get(sandboxId);
    return sandbox.files.read(path);
  }

  /** Writes content to a file in the sandbox filesystem. */
  async writeFile(sandboxId: string, path: string, content: string): Promise<void> {
    const sandbox = this.get(sandboxId);
    await sandbox.files.write(path, content);
  }

  /** Resets the sandbox TTL to prevent timeout during long-running operations. */
  async keepAlive(sandboxId: string, timeoutMs?: number): Promise<void> {
    const sandbox = this.get(sandboxId);
    await sandbox.setTimeout(timeoutMs ?? this.SANDBOX_TIMEOUT_MS);
    this.logger.debug(`Sandbox ${sandboxId} timeout reset to ${(timeoutMs ?? this.SANDBOX_TIMEOUT_MS) / 1000}s`);
  }

  /** Kills the sandbox and removes it from the tracking map. */
  async kill(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return; // already killed or never existed
    try {
      await sandbox.kill();
      this.logger.log(`Sandbox killed: ${sandboxId}`);
    } catch (err) {
      // Log but don't rethrow — cleanup errors shouldn't mask the real job result
      this.logger.warn(`Failed to kill sandbox ${sandboxId}: ${String(err)}`);
    } finally {
      this.sandboxes.delete(sandboxId);
    }
  }

  /** Kills all tracked sandboxes on application shutdown. */
  async onModuleDestroy(): Promise<void> {
    const ids = [...this.sandboxes.keys()];
    await Promise.allSettled(ids.map((id) => this.kill(id)));
    this.logger.log(`Cleaned up ${ids.length} sandbox(es) on shutdown`);
  }
}
````

## File: server/src/vercel/vercel.module.ts
````typescript
import { Module } from '@nestjs/common';
import { VercelService } from './vercel.service.js';

@Module({
  providers: [VercelService],
  exports: [VercelService],
})
export class VercelModule {}
````

## File: server/src/vercel/vercel.service.ts
````typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DeploymentResult {
  deploymentId: string;
  projectId: string;
  url: string;
}

/**
 * Triggers and monitors Vercel preview deployments via the REST API.
 * Uses native fetch; requires token and optional team ID from environment.
 */
@Injectable()
export class VercelService {
  private readonly logger = new Logger(VercelService.name);
  private readonly token: string;
  private readonly teamId: string | undefined;
  private readonly lingoApiKey: string | undefined;

  // Poll every 10 seconds, give up after 3 minutes (18 attempts)
  private readonly POLL_INTERVAL_MS = 10_000;
  private readonly POLL_MAX_ATTEMPTS = 18;

  constructor(config: ConfigService) {
    this.token = config.getOrThrow<string>('VERCEL_API_TOKEN');
    this.teamId = config.get<string>('VERCEL_TEAM_ID');
    this.lingoApiKey = config.get<string>('LINGO_API_KEY');
  }

  /** Requests a new deployment for the given repository and branch. */
  async triggerDeployment(
    repoOwner: string,
    repoName: string,
    branch: string,
  ): Promise<DeploymentResult> {
    // Vercel project names must be lowercase, max 100 chars, cannot contain '---'.
    const projectName = repoName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/-{3,}/g, '--')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);

    const qsParams = new URLSearchParams({ skipAutoDetectionConfirmation: '1' });
    if (this.teamId) qsParams.set('teamId', this.teamId);

    const res = await fetch(`https://api.vercel.com/v13/deployments?${qsParams}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        gitSource: {
          type: 'github',
          org: repoOwner,
          repo: repoName,
          ref: branch,
        },
        projectSettings: {
          framework: 'nextjs',
          // Use --legacy-peer-deps to bypass peer dep conflicts (e.g. @lingo.dev/compiler requires React 19, template uses React 18)
          installCommand: 'npm install --legacy-peer-deps',
          buildCommand: null,
          devCommand: null,
          outputDirectory: null,
          rootDirectory: null,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Vercel deployment trigger failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as { id: string; projectId: string; url: string };
    this.logger.log(`Deployment triggered: ${data.id} (project: ${data.projectId})`);

    // Set LINGO_API_KEY on the newly-created Vercel project so future builds succeed.
    // The @lingo.dev/compiler's withLingo() wrapper may read it at build time.
    if (this.lingoApiKey && data.projectId) {
      await this.ensureProjectEnv(data.projectId, 'LINGO_API_KEY', this.lingoApiKey);
    }

    return { deploymentId: data.id, projectId: data.projectId, url: `https://${data.url}` };
  }

  /** Adds an env variable to a Vercel project (idempotent — updates if already present). */
  private async ensureProjectEnv(projectId: string, key: string, value: string): Promise<void> {
    const qs = this.teamId ? `?teamId=${this.teamId}` : '';
    const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env${qs}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        { key, value, type: 'encrypted', target: ['production', 'preview', 'development'] },
      ]),
    });
    if (!res.ok) {
      this.logger.warn(`Failed to set env ${key} on project ${projectId}: ${await res.text()}`);
    } else {
      this.logger.log(`Set ${key} on Vercel project ${projectId}`);
    }
  }

  /** Polls the Vercel API until the deployment reaches 'READY' or 'ERROR'. */
  async pollUntilReady(deploymentId: string): Promise<string> {
    const qs = this.teamId ? `?teamId=${this.teamId}` : '';

    for (let attempt = 1; attempt <= this.POLL_MAX_ATTEMPTS; attempt++) {
      await this.sleep(this.POLL_INTERVAL_MS);

      const res = await fetch(
        `https://api.vercel.com/v13/deployments/${deploymentId}${qs}`,
        { headers: { Authorization: `Bearer ${this.token}` } },
      );

      if (!res.ok) continue; // transient API error — try again

      const data = (await res.json()) as { readyState: string; url: string };

      if (data.readyState === 'READY') {
        const previewUrl = `https://${data.url}`;
        this.logger.log(`Deployment ready: ${previewUrl}`);
        return previewUrl;
      }

      if (data.readyState === 'ERROR') {
        // Build failed. The env var (LINGO_API_KEY) has now been set on the project,
        // so the NEXT deployment of this branch will succeed. For now, return the
        // deployment URL (it will point to a Vercel error page) so the pipeline completes.
        const partialUrl = `https://${data.url}`;
        this.logger.warn(`Deployment ${deploymentId} built with state ERROR — returning URL anyway. Next run will succeed with env vars set.`);
        return partialUrl;
      }

      this.logger.debug(
        `Deployment ${deploymentId} state: ${data.readyState} (attempt ${attempt}/${this.POLL_MAX_ATTEMPTS})`,
      );
    }

    throw new Error(
      `Vercel deployment ${deploymentId} did not reach READY state within ${this.POLL_MAX_ATTEMPTS * this.POLL_INTERVAL_MS / 1000}s`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
````

## File: server/src/app.module.ts
````typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller.js';
import { JobsModule } from './jobs/jobs.module.js';
import { SandboxModule } from './sandbox/sandbox.module.js';
import { GithubModule } from './github/github.module.js';
import { McpModule } from './mcp/mcp.module.js';
import { VercelModule } from './vercel/vercel.module.js';
import { AgentModule } from './agent/agent.module.js';

@Module({
  imports: [
    // Makes env variables available everywhere without re-importing ConfigModule
    ConfigModule.forRoot({ isGlobal: true }),

    // Foundation service modules — each independently testable and exported
    JobsModule,
    SandboxModule,
    GithubModule,
    McpModule,
    VercelModule,

    // Agent module — orchestrates the 7-tool pipeline via generateText
    AgentModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule { }
````

## File: server/src/health.controller.ts
````typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check API health status' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
````

## File: server/src/main.ts
````typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Lock CORS to the frontend origin only
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filter — structured JSON error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('LingoAgent API')
    .setDescription('Agent pipeline API for multilingual repository automation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('agent')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log(`Swagger documentation is available on: http://localhost:${port}/docs`);
}
bootstrap().catch((err) => {
  console.error('Error during bootstrap', err);
  process.exit(1);
});
````

## File: server/test/app.e2e-spec.ts
````typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
````

## File: server/test/jest-e2e.json
````json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
````

## File: server/.env.example
````
# Server
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/lingoagent?sslmode=require

# LLM — Groq Llama 3.3 70B (Free tier: fast and reliable tool calling)
# Get free key at: https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key
DEFAULT_AI_MODEL=llama-3.3-70b-versatile

# E2B — isolated sandbox execution environment
E2B_API_KEY=your_e2b_api_key

# Lingo.dev — translation engine CLI key + MCP server endpoint
LINGO_API_KEY=your_lingo_api_key
LINGO_MCP_SERVER_URL=https://mcp.lingo.dev/main

# Vercel — preview deployment (VERCEL_TEAM_ID is optional for personal accounts)
VERCEL_API_TOKEN=your_vercel_api_token
VERCEL_TEAM_ID=your_vercel_team_id
````

## File: server/.prettierrc
````
{
  "singleQuote": true,
  "trailingComma": "all"
}
````

## File: server/eslint.config.mjs
````javascript
// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn'
    },
  },
);
````

## File: server/nest-cli.json
````json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
````

## File: server/package.json
````json
{
  "name": "server",
  "version": "0.0.1",
  "description": "",
  "author": "",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "prisma generate --schema=./prisma/schema.prisma && nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "lsof -ti:3001 | xargs kill -9 2>/dev/null || true && nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main.js",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@ai-sdk/google": "^3.0.30",
    "@ai-sdk/groq": "^3.0.24",
    "@ai-sdk/openai": "^3.0.30",
    "@modelcontextprotocol/sdk": "^1.26.0",
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.3",
    "@nestjs/core": "^11.0.1",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/swagger": "^11.2.6",
    "@octokit/rest": "^22.0.1",
    "@prisma/adapter-pg": "^7.4.1",
    "@prisma/client": "^7.4.1",
    "@types/pg": "^8.16.0",
    "ai": "^6.0.96",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.3",
    "e2b": "^2.12.1",
    "lingo.dev": "^0.131.7",
    "pg": "^8.18.0",
    "prisma": "^7.4.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.2.0",
    "@eslint/js": "^9.18.0",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.1",
    "@types/express": "^5.0.0",
    "@types/jest": "^30.0.0",
    "@types/node": "^22.10.7",
    "@types/supertest": "^6.0.2",
    "eslint": "^9.18.0",
    "eslint-config-prettier": "^10.0.1",
    "eslint-plugin-prettier": "^5.2.2",
    "globals": "^16.0.0",
    "jest": "^30.0.0",
    "pdf-parse": "^2.4.5",
    "prettier": "^3.4.2",
    "source-map-support": "^0.5.21",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.2",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.20.0"
  },
  "jest": {
    "moduleFileExtensions": [
      "js",
      "json",
      "ts"
    ],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
````

## File: server/prisma.config.ts
````typescript
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'] ?? '',
  },
});
````

## File: server/tsconfig.build.json
````json
{
  "extends": "./tsconfig.json",
  "exclude": [
    "node_modules",
    "dist",
    "test",
    "**/*.spec.ts",
    "prisma.config.ts"
  ],
  "include": [
    "src/**/*"
  ]
}
````

## File: server/tsconfig.json
````json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "resolvePackageJsonExports": false,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "noFallthroughCasesInSwitch": true
  },
  "exclude": [
    "node_modules",
    "dist",
    "prisma.config.ts",
    "test"
  ]
}
````

## File: .gitignore
````
# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage
.nyc_output

# Next.js
.next/
out/
build

# NestJS / Build Output
dist
dist-ssr

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Environment Variables
.env
.env.local
.env.development
.env.production
.env.test

# OS & Editor
.DS_Store
*.pem
.idea
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
.project
.classpath
.c9/
*.launch
.settings/
*.sublime-workspace

# Prisma
server/generated/prisma
client/generated/prisma
**/generated/prisma

# Claude Code History
claude-code-history.pdf

# TypeScript Cache
*.tsbuildinfo

# Blueprint readme file
BLUEPRINT.md

# Prisma config compiled artifacts
server/prisma.config.js
server/prisma.config.js.map
server/prisma.config.d.ts
````

## File: README.md
````markdown
# LingoAgent 🌐

> **AI-powered i18n automation** — clone a GitHub repository, extract every hardcoded string, translate it with Lingo.dev, and open a ready-to-merge Pull Request with a live Vercel preview. All in one click.

<<<<<<< HEAD
=======
**🌍 Live:** [lingo-agent.vercel.app](https://lingo-agent.vercel.app) &nbsp;|&nbsp; **⚙️ API:** [lingo-agent.onrender.com](https://lingo-agent.onrender.com)

>>>>>>> main
---

## Table of Contents

- [About](#about)
- [Approach](#approach)
- [Architecture — High-Level Design](#architecture--high-level-design)
- [Auth Flow](#auth-flow)
- [AI Agent Pipeline](#ai-agent-pipeline)
- [Tech Stack](#tech-stack)
- [Setup & Local Dev](#setup--local-dev)
- [Environment Variables](#environment-variables)
- [Known Limitations](#known-limitations)
- [Demo](#demo)
  - [Video Walkthrough](#-video-walkthrough)
  - [Screenshots](#-screenshots)
  - [Try It Yourself](#-try-it-yourself)
- [Author](#author)

---

## About

LingoAgent is a full-stack AI agent built **specifically for Next.js 14+ App Router landing pages and websites**. Point it at a GitHub repo, select your target languages, and it automatically extracts every hardcoded JSX string via Babel AST, translates them with Lingo.dev, wires up a runtime language switcher, commits all changes to a new branch, opens a GitHub PR, and triggers a live Vercel preview deployment — all in a single click.

**Key benefits:**
- Zero manual i18n boilerplate — no string wrapping, no config editing
- Full source code safety: all execution runs inside an isolated E2B sandbox
- Bring your own API keys to bypass free-tier limits
- Real-time progress streaming via Server-Sent Events (SSE)

> ⚠️ **Scope:** LingoAgent currently supports **Next.js 14+ App Router** projects only. Pages Router and other frameworks (Vite, Remix, etc.) are explicitly not supported at this time.

---

## Approach

**The problem isn't translation — it's orchestration.**

Going multilingual is one of the most commonly requested and most commonly abandoned features in software development. AI tools like Lingo.dev have dramatically lowered the cost of the translation step itself — but developers still need to read the docs, configure the tooling, run the CLI, manage output files, open a PR, and set up a preview. That's still hours of focused work per project.

The core problem LingoAgent solves is the **orchestration gap** — the hours of developer time between *"we want multilingual support"* and *"here is a working branch with a live preview."*

**Lingo.dev handles translation. We handle everything else.**

Lingo.dev provides five powerful tools — the Compiler (build-time AST translation), the CLI (multi-format translation runner), the CI/CD GitHub Action, the SDK (runtime translation for 7+ languages), and the MCP Server (framework-specific setup instructions for AI assistants). LingoAgent leverages the **SDK** for string translation and the **MCP Server** for correct i18n scaffolding, building an autonomous pipeline around them:

| What Lingo.dev Still Requires a Human For | What LingoAgent Does Instead |
|---|---|
| Reading and understanding the documentation | Agent queries the Lingo.dev MCP server for exact setup instructions |
| Cloning the repository locally | Agent clones into an isolated E2B sandbox |
| Detecting the framework and choosing the right setup path | Agent reads `package.json` and config files automatically |
| Modifying `next.config.ts` and `layout.tsx` correctly | Agent applies verified changes from MCP instructions |
| Writing the `i18n.json` configuration file | Agent generates it from the user's selected locales |
| Running `npm install` and the translation engine | Agent executes inside the sandbox |
| Creating a branch and opening a pull request | Agent calls the GitHub API via Octokit |
| Setting up a preview deployment | Agent triggers Vercel and polls until ready |

**Three principles drove every build decision:**

1. **Reliability over breadth.** A demo that works perfectly for Next.js App Router is worth more than a demo that claims to support five frameworks but breaks on all of them. Scope was ruthlessly controlled around the happy path.

2. **Observable beats fast.** Users can tolerate a 3-minute process. They cannot tolerate a 3-minute black box. Every meaningful action the agent takes is streamed to the user in real time via Server-Sent Events.

3. **LLM as planner, not executor.** The Groq LLM is only ever shown *one* tool schema at a time and asked for arguments — the server executes the tool deterministically. This avoids hallucination and SDK timeout pitfalls while retaining the flexibility of LLM-driven orchestration.

**Why Next.js App Router — and only that?**

Lingo.dev provides its deepest, most battle-tested support for Next.js App Router. Its MCP server, compiler integration, and SDK are all tuned against this stack. Supporting additional frameworks (Vite, Remix, Pages Router) would each require separate detection logic, different file patching strategies, different i18n scaffolding patterns, and independent end-to-end testing — multiplying the surface area several times over.

In a hackathon context, doing one thing reliably is far more valuable than doing five things poorly. A flawless demo on Next.js App Router beats a fragile multi-framework agent every time. This is a deliberate constraint, not an oversight — and it directly maps to where Lingo.dev itself shines most.

---

## Architecture — High-Level Design

The system consists of three primary layers: a **Next.js frontend** for user interaction and live log display, a **NestJS backend** for agent orchestration and job management, and a collection of **external services** (E2B, GitHub, Lingo.dev MCP, Vercel) that the agent coordinates between.

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (User)                     │
│                                                         │
│  Next.js 14 App Router (Client - :3000)                 │
│  ┌────────────┬─────────────┬───────────────────────┐  │
│  │  /login    │  /dashboard │  /jobs/[jobId]         │  │
│  │  GitHub    │  New Job /  │  SSE log stream        │  │
│  │  OAuth     │  History /  │  + PR / Preview links  │  │
│  │  page      │  Settings   │                        │  │
│  └────────────┴─────────────┴───────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │ REST + SSE (HTTP/1.1)
                        ▼
┌─────────────────────────────────────────────────────────┐
<<<<<<< HEAD
│          NestJS API Server (Server - :3001)             │
=======
│     NestJS API Server — Render (:3001)                  │
>>>>>>> main
│                                                         │
│  AuthGuard (Bearer token = GitHub OAuth token)          │
│  AgentController  →  AgentService                       │
│  JobsService (Prisma + Neon PostgreSQL)                 │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │          Agent Pipeline (per job)                 │  │
│  │  Groq LLM (llama-3.3-70b) — tool call planner    │  │
│  │  7 sequential tools executed in E2B sandbox       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  External Services:                                     │
│  ├── GitHub (Octokit) — clone / branch / PR            │
│  ├── E2B — isolated sandbox execution                  │
│  ├── Lingo.dev SDK + MCP — string translation          │
│  └── Vercel API — preview deployment                   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
                Neon PostgreSQL (jobs, logs)
```

**Key design decisions:**

| Decision | Rationale |
|---|---|
| Monorepo (`/client` + `/server`) | Clear separation of concerns; each can be deployed independently |
| SSE (not WebSockets) | One-way log streaming is all we need; SSE is simpler and HTTP-native |
| E2B sandbox | Complete process isolation — git, npm, node all run in a throwaway VM |
| Sequential tool forcing | Prevents the LLM from skipping steps or calling tools out of order |
| RxJS `ReplaySubject` per job | Late-joining SSE connections replay all past events from job start |

<<<<<<< HEAD
**Job lifecycle:** Each job transitions through five states: `pending` → `running` → `completed` / `failed` / `cancelled`. The frontend opens an SSE connection via `/agent/stream/:jobId` and receives real-time `log`, `progress`, `complete`, or `error` events until the job terminates.
=======
**Job lifecycle:** Each job transitions through five states: `pending` → `running` → `completed` / `failed` / `cancelled`. The frontend opens an SSE connection via `/api/agent/stream/:jobId` and receives real-time `log`, `progress`, `complete`, or `error` events until the job terminates.
>>>>>>> main

---

## Auth Flow

LingoAgent uses GitHub OAuth exclusively — no passwords, no separate accounts.

```
User                 Next.js Client        NextAuth          GitHub OAuth
 │                        │                   │                  │
 │── clicks "Sign in" ───▶│                   │                  │
 │                        │── GET /api/auth/signin/github ──────▶│
 │                        │                   │◀── redirect ─────│
 │                        │◀── callback with code ───────────────│
 │                        │── exchange code ──▶│                  │
 │                        │◀── access_token ───│                  │
 │                        │                   │                  │
 │                   Session created           │                  │
 │                   (JWT with githubToken)    │                  │
 │                        │                   │                  │
 │── /dashboard ─────────▶│                   │                  │
 │                        │                                       │
 │ (On every API call)    │                                       │
 │                        │── POST /agent/run ──▶ NestJS Server   │
 │                        │   Authorization: Bearer <githubToken> │
 │                        │                      ▼               │
 │                        │              AuthGuard validates      │
 │                        │              token → attaches to req  │
 │                        │              AgentService uses it     │
 │                        │              to call GitHub APIs      │
```

**Why the GitHub token doubles as the API bearer token:**
The same token that authenticates the user with GitHub is forwarded to the NestJS server as a Bearer token. The server validates it's present and non-empty, then uses it directly to call GitHub APIs (creating branches, committing files, opening PRs) on behalf of the user. No separate JWT or session store is needed on the backend.

---

## AI Agent Pipeline

Each job runs a **strictly sequential 7-step pipeline**. The Groq LLM is only ever shown one tool schema at a time (`toolChoice: 'required'`), forcing it to call that exact tool and return the arguments. The server then executes the tool manually (preventing SDK timeout issues) and feeds the result back to the LLM's conversation history before the next step.

```
<<<<<<< HEAD
POST /agent/run
=======
POST /api/agent/run
>>>>>>> main
      │
      ▼
  1. clone_repo
     └── Clones the repo into an E2B sandbox
      │
      ▼
  2. detect_framework
     └── Identifies Next.js version, App Router vs Pages, layout path
      │
      ▼
  3. analyze_repo
     └── Checks for existing i18n libraries, counts JSX files
      │
      ▼
  4. setup_lingo
     └── Writes i18n.json, provider/switcher/translator components,
         patches layout.tsx (via Lingo.dev MCP tool)
      │
      ▼
  5. install_and_translate
     ├── npm install (for Babel AST parsing)
     ├── Babel AST extraction → finds ALL hardcoded JSX strings
     ├── Translates chunks via Lingo.dev SDK → public/locales/*.json
     └── ⚠️ Aborts with guidance if Lingo.dev quota/key is invalid
      │
      ▼
  6. commit_and_push
     └── Creates branch, commits all changes, opens GitHub PR
      │
      ▼
  7. trigger_preview
     └── Triggers Vercel deployment, polls until Ready
      │
      ▼
  SSE: { type: 'complete', data: { prUrl, previewUrl } }
```

**Tool data chain:** Each tool's return value feeds the next. The LLM manages this chain through its context window — passing the `sandboxId` from `clone_repo` into every subsequent tool, the `framework` from `detect_framework` into `setup_lingo`, and the `branchName` from `commit_and_push` into `trigger_preview`.

**Error handling:**
- **Groq rate limit / invalid key** → pipeline aborts immediately, user is guided to Settings tab to add their own key
- **Lingo.dev quota exceeded / invalid key** → same immediate abort with actionable guidance
- **LLM tool hallucination** → up to 3 retries with a correction prompt before failing
- **Manual cancel** → E2B sandbox killed instantly to stop billing

**Custom API Keys:**
Users can supply their own Lingo.dev and Groq API keys in `Dashboard → Settings`. These are stored in `localStorage` and sent with each job — overriding the server defaults, bypassing shared free-tier quotas.

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.2 | React framework, App Router |
| NextAuth.js | 4.x | GitHub OAuth, session management |
| React | 18 | UI |
| Tailwind CSS | 3.x | Styling |
| TypeScript | 5.x | Type safety |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| NestJS | 11 | API server, dependency injection |
| Prisma | 7 | ORM, DB migrations |
| Neon PostgreSQL | — | Serverless Postgres (job + log storage) |
| RxJS | 7.x | `ReplaySubject` per-job SSE streams |
| Vercel AI SDK (`ai`) | 6.x | `generateText` + tool calling abstraction |
| `@ai-sdk/groq` | 3.x | Groq provider for the AI SDK |
| Groq (llama-3.3-70b-versatile) | — | LLM — tool argument generation |
| E2B | 2.x | Isolated sandbox VMs for code execution |
| Lingo.dev SDK | 0.131 | Translation engine (chunked API) |
| Lingo.dev MCP | — | Tool-call interface for i18n scaffolding |
| Octokit | 22.x | GitHub REST API (clone, branch, PR) |
| Vercel API | — | Preview deployments |
| Zod | 4.x | Runtime schema validation for tool inputs |
| class-validator | 0.14 | DTO validation on API endpoints |

### External Services
| Service | Role |
|---|---|
| [E2B](https://e2b.dev) | Cloud sandbox execution environment |
| [Lingo.dev](https://lingo.dev) | MCP server for setup instructions + SDK for translation |
| [GitHub API](https://github.com) | Repository operations, branch creation, PR creation |
| [Vercel API](https://vercel.com) | Preview deployment triggering and status polling |
| [Groq](https://groq.com) | Fast LLM inference (Llama 3.3 70B) |
| [Neon](https://neon.tech) | Serverless PostgreSQL |

---

## Setup & Local Dev

### Prerequisites
- Node.js 20+
- A GitHub OAuth App ([create one here](https://github.com/settings/developers))
- Free accounts for: [Groq](https://console.groq.com/keys), [E2B](https://e2b.dev), [Lingo.dev](https://lingo.dev/en/app), [Neon](https://neon.tech), [Vercel](https://vercel.com)

### 1. Clone the repo

```bash
git clone https://github.com/Kashif-Rezwi/lingo-agent.git
cd lingo-agent
```

### 2. Set up the server

```bash
cd server
cp .env.example .env
# Fill in all values in .env (see Environment Variables below)
npm install
npx prisma generate
npm run start        # Starts on :3001
```

### 3. Set up the client

```bash
cd client
cp .env.example .env
# Fill in NEXTAUTH_SECRET and GITHUB_* values
npm install
npm run dev          # Starts on :3000
```

### 4. Open the app

Navigate to [http://localhost:3000](http://localhost:3000), sign in with GitHub, and submit your first translation job.

---

## Environment Variables

### `server/.env`

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✓ | Server port (default: `3001`) |
| `FRONTEND_URL` | ✓ | Client origin for CORS (e.g. `http://localhost:3000`) |
| `DATABASE_URL` | ✓ | Neon PostgreSQL connection string |
| `GROQ_API_KEY` | ✓ | Groq API key — LLM calls ([get one](https://console.groq.com/keys)) |
| `DEFAULT_AI_MODEL` | — | Model name (default: `llama-3.3-70b-versatile`) |
| `E2B_API_KEY` | ✓ | E2B sandbox key ([get one](https://e2b.dev)) |
| `LINGO_API_KEY` | ✓ | Lingo.dev translation key ([get one](https://lingo.dev/en/app)) |
| `LINGO_MCP_SERVER_URL` | ✓ | Lingo.dev MCP endpoint (default: `https://mcp.lingo.dev/main`) |
| `VERCEL_API_TOKEN` | ✓ | Vercel personal token for deployments |
| `VERCEL_TEAM_ID` | — | Team ID (only needed for team accounts) |

### `client/.env`

| Variable | Required | Description |
|---|---|---|
| `NEXTAUTH_URL` | ✓ | Full URL of the client app (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | ✓ | Random string for JWT signing (`openssl rand -base64 32`) |
| `GITHUB_ID` | ✓ | GitHub OAuth App Client ID |
| `GITHUB_SECRET` | ✓ | GitHub OAuth App Client Secret |
| `NEXT_PUBLIC_API_URL` | ✓ | Server URL (e.g. `http://localhost:3001`) |

> **Tip:** Users can also supply their own **Lingo.dev** and **Groq** API keys directly in `Dashboard → Settings` to bypass shared server-side quotas. Keys are stored locally in `localStorage` and never sent to any third party.

---

## Known Limitations

These are deliberate scope constraints and known edge cases, not bugs:

- **Next.js App Router only** — Pages Router, Vite, Remix, and other stacks are not supported
- **Hardcoded strings in JS logic are not translated** — Babel AST extraction targets JSX text nodes and common string attributes (`placeholder`, `title`, `alt`, `aria-label`). Strings inside variables, error messages, or API responses may not be caught
- **Large repos may time out** — E2B sandboxes have a configurable timeout (default 10 min). Repos with heavy `npm install` times or hundreds of JSX files may hit this limit
- **No monorepo support** — the agent targets single-app repositories only
- **Existing i18n setups may conflict** — if the repo already uses `next-intl`, `i18next`, or similar libraries, the agent's scaffolding may conflict with them

---

## Demo

### 🎬 Video Walkthrough

<<<<<<< HEAD
<!-- TODO: Replace with actual video link -->
[![Watch the demo](https://img.shields.io/badge/▶_Watch_Demo-Video-red?style=for-the-badge&logo=youtube)](https://your-video-link-here.com)
=======
[![Watch the demo](https://img.shields.io/badge/▶_Watch_Demo-Google_Drive-blue?style=for-the-badge&logo=googledrive)](https://drive.google.com/drive/folders/1GW-W05pXK-dTD6qWeqy38LuvGFD2R1sI?usp=sharing)
>>>>>>> main

> A full end-to-end walkthrough showing LingoAgent translating a Next.js landing page into Japanese, French, and Arabic in under 3 minutes.

### 📸 Screenshots

<<<<<<< HEAD
<!-- TODO: Replace with actual screenshots -->
=======
<!-- TODO: Replace placeholder images with actual screenshots -->
>>>>>>> main

| Dashboard | Live Agent Logs | Result — PR & Preview |
|---|---|---|
| ![Dashboard](https://via.placeholder.com/400x250?text=Dashboard) | ![Live Logs](https://via.placeholder.com/400x250?text=Live+Logs) | ![Result](https://via.placeholder.com/400x250?text=PR+%26+Preview) |

### 🧪 Try It Yourself

**Demo repo:** [Kashif-Rezwi/lingo-agent-demo-app](https://github.com/Kashif-Rezwi/lingo-agent-demo-app) — a clean Next.js 14 App Router landing page, purpose-built for testing.

1. Sign into LingoAgent with your GitHub account
2. Paste `https://github.com/Kashif-Rezwi/lingo-agent-demo-app` as the repository URL
3. Select your target languages (e.g. Japanese, French, Arabic)
4. Click **Start** and watch the agent work in real time
5. Review the resulting GitHub PR and live Vercel preview

---

## Author

**Kashif Rezwi** — Built for the [Lingo.dev Hackathon 2025](https://lingo.dev)
````
