import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';

/**
 * Automatically unwraps the backend's ApiResponse<T> wrapper.
 *
 * Every backend response comes as:
 *   { success: true, message: "...", data: <T>, errors: [] }
 *
 * After this interceptor, all services receive <T> directly —
 * no need to read .data in every service call.
 */
export const responseInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map(event => {
      if (!(event instanceof HttpResponse)) return event;

      const body = event.body as { success?: boolean; data?: unknown; message?: string; errors?: string[] } | null;

      // Only unwrap if this looks like our ApiResponse<T> wrapper
      if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
        return event.clone({ body: body.data ?? null });
      }

      return event;
    })
  );
};
