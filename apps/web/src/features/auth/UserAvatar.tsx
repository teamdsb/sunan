import Avatar, { type AvatarProps } from 'antd/es/avatar';
import { useEffect, useState } from 'react';

interface UserAvatarProps extends Omit<AvatarProps, 'children' | 'src'> {
  name: string;
  avatar?: string | null;
}

function firstCharacter(value: string): string {
  return Array.from(value.trim())[0] ?? '?';
}

export function UserAvatar({ name, avatar, ...avatarProps }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatar]);

  const image =
    avatar && !imageFailed ? (
      <img
        src={avatar}
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
