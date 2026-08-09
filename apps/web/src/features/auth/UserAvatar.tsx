import Avatar, { type AvatarProps } from 'antd/es/avatar';
import { useEffect, useState } from 'react';

interface UserAvatarProps extends Omit<AvatarProps, 'children' | 'src'> {
  name: string;
  avatar?: string | null;
}

function firstCharacter(value: string): string {
  return Array.from(value.trim())[0] ?? '?';
}

function normalizeAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) {
    return null;
  }

  try {
    const url = new URL(avatar);
    const isWecomAvatarHost =
      url.hostname === 'qpic.cn' ||
      url.hostname.endsWith('.qpic.cn') ||
      url.hostname === 'qlogo.cn' ||
      url.hostname.endsWith('.qlogo.cn');
    if (url.protocol === 'http:' && isWecomAvatarHost) {
      url.protocol = 'https:';
    }
    return url.toString();
  } catch {
    return avatar;
  }
}

export function UserAvatar({ name, avatar, ...avatarProps }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = normalizeAvatarUrl(avatar);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const image =
    avatarUrl && !imageFailed ? (
      <img
        src={avatarUrl}
        alt={`${name}的头像`}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
      />
    ) : undefined;

  return (
    <Avatar {...avatarProps} src={image}>
      {firstCharacter(name)}
    </Avatar>
  );
}
