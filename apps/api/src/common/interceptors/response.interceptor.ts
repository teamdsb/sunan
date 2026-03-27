import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<{ data: unknown; meta?: unknown } | undefined> {
    const response = context.switchToHttp().getResponse<{ statusCode?: number }>();

    return next.handle().pipe(
      map((value: unknown) => {
        if (response.statusCode === 204 || typeof value === 'undefined') {
          return undefined;
        }

        if (
          typeof value === 'object' &&
          value !== null &&
          'data' in value
        ) {
          return value as { data: unknown; meta?: unknown };
        }

        return { data: value };
      }),
    );
  }
}
