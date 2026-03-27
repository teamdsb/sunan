import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { CurrentUser } from 'src/common/interfaces/current-user.interface';

export const CurrentUserDecorator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: CurrentUser }>();
    return request.user;
  },
);
