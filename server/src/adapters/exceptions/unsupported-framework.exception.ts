import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';

/**
 * Thrown by AdapterRegistryService.detect() when no adapter reaches
 * the minimum confidence threshold (0.70) for the given repository.
 */
export class UnsupportedFrameworkException extends AppException {
    constructor(context?: Record<string, unknown>) {
        super(
            'No supported framework detected in this repository. ' +
            'Supported frameworks: nextjs-app-router, nextjs-pages-router, vite-react, remix.',
            HttpStatus.UNPROCESSABLE_ENTITY,
            context,
        );
    }
}
