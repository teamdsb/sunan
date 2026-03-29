import type { AuthSuccessPayload } from '../../features/auth/types';

export const mockAuthPayload: AuthSuccessPayload = {
  accessToken: 'mock-access-token',
  expiresIn: 3600,
  user: {
    userId: 'mock-admin',
    name: '调试管理员',
    department: ['苏南船舶管理'],
    position: '前端调试',
    roles: ['system_admin', 'general_office'],
  },
};
