import type { EntityManager } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { FileEntity } from 'src/database/entities/file.entity';
import { EvidenceAuditEntity } from 'src/database/entities/evidence-audit.entity';

export async function auditAttachmentRemoval(
  manager: EntityManager, objectType: string, objectId: string, fileIds: string[], operatorUserId: string, reason: string,
): Promise<void> {
  for (const fileId of [...new Set(fileIds)]) {
    const file = await manager.findOneBy(FileEntity, { id: fileId });
    await manager.insert(EvidenceAuditEntity, {
      objectType, objectId, fileId: null, action: 'remove_attachment', operatorUserId, reason,
      metadata: { fileId, fileName: file?.fileName, fileSize: file?.fileSize, mimeType: file?.mimeType, ossKey: file?.ossKey },
    });
  }
}

export const FILE_RETENTION_MS = 24 * 60 * 60 * 1000;

// Lock old and new files together before changing relations to avoid cross-record swap deadlocks.
export async function lockAttachmentFiles(manager: EntityManager, fileIds: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (const id of [...new Set(fileIds)].sort()) {
    const file = await manager.findOne(FileEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
    if (file) found.add(id);
  }
  return found;
}

export async function assertTemporaryFileAccess(manager: EntityManager, file: FileEntity, user?: CurrentUser): Promise<void> {
  if (!user || file.uploadedBy !== user.userId || await hasFileReferences(manager, file.id)) {
    throw new ForbiddenException('请通过有权限的业务记录访问文件');
  }
}

// Call in the same transaction that inserts the business references. Existing target
// attachments can be retained, but knowing a file ID does not authorize a new link.
export async function assertAttachmentFilesBindable(
  manager: EntityManager, fileIds: string[], user: CurrentUser, retainedFileIds: string[] = [],
): Promise<Set<string>> {
  const available = await lockAttachmentFiles(manager, [...fileIds, ...retainedFileIds]);
  const retained = new Set(retainedFileIds);
  for (const id of new Set(fileIds)) {
    if (!available.has(id) || retained.has(id) || user.roles.includes('system_admin')) continue;
    const file = await manager.findOneByOrFail(FileEntity, { id });
    await assertTemporaryFileAccess(manager, file, user);
  }
  return available;
}

export async function hasFileReferences(manager: EntityManager, id: string): Promise<boolean> {
  const rows = await manager.query(`SELECT EXISTS (
    SELECT 1 FROM certificate_files WHERE file_id = $1::uuid
    UNION ALL SELECT 1 FROM enterprise_profile_files WHERE file_id = $1::uuid
    UNION ALL SELECT 1 FROM enterprise_policy_files WHERE file_id = $1::uuid
    UNION ALL SELECT 1 FROM procurement_order_files WHERE file_id = $1::uuid
    UNION ALL SELECT 1 FROM workbench_record_attachments WHERE file_id = $1::uuid
    UNION ALL SELECT 1 FROM inspection_result_evidence WHERE file_id = $1::uuid
    UNION ALL SELECT 1 FROM capa_action_evidence WHERE file_id = $1::uuid
    UNION ALL SELECT 1 FROM inspection_results WHERE signature_file_id = $1::uuid
    UNION ALL SELECT 1 FROM evidence_records WHERE file_id = $1::uuid
    UNION ALL SELECT 1 FROM evidence_audits WHERE file_id = $1::uuid
    UNION ALL SELECT 1 FROM procurement_reports WHERE export_pdf_file_id = $1::uuid
    UNION ALL SELECT 1 FROM export_jobs WHERE result_file_id = $1::uuid
    UNION ALL SELECT 1 FROM workbench_print_snapshots WHERE rendered_file_id = $1::text
  ) AS referenced`, [id]) as unknown as Array<{ referenced: boolean }>;
  const result = rows[0];
  if (typeof result?.referenced !== 'boolean') throw new Error('File reference check failed');
  return result.referenced;
}

// Run in the business transaction after removing relations; a genuine unlink starts a fresh grace period.
export async function scheduleFileRecycle(manager: EntityManager, fileIds: string[]): Promise<void> {
  for (const id of [...new Set(fileIds)].sort()) {
    const file = await manager.findOne(FileEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!file) continue;
    file.orphanedAt = await hasFileReferences(manager, id) ? null : new Date();
    await manager.save(FileEntity, file);
  }
}
