import {
  BellOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  MonitorOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Empty, Typography } from 'antd';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { myRouteNavItems } from '../../router/myRouteConfig';
import { useGetCertificatesQuery } from '../certificate/certificateApi';
import { useGetShipMonitorsQuery } from '../monitor/monitorApi';
import type { ReminderItem } from '../reminder/reminderApi';
import {
  useGetReminderDashboardQuery,
  useGetReminderListQuery,
} from '../reminder/reminderApi';
import { useGetWorkbenchDashboardQuery } from '../workbench/workbenchApi';

const entries = myRouteNavItems.filter((item) => item.path !== '/my');

const entryIcons: Record<string, ComponentType> = {
  '/my/enterprise-profile': FileSearchOutlined,
  '/my/enterprise-policy': FileProtectOutlined,
  '/my/certificates': SafetyCertificateOutlined,
  '/my/reminders': BellOutlined,
  '/my/monitors': MonitorOutlined,
  '/my/settings': SettingOutlined,
};

function uniqueCount<T>(
  items: T[],
  keyOf: (item: T) => string | null | undefined,
) {
  return new Set(items.map(keyOf).filter(Boolean)).size;
}

function formatCount(value: number | undefined, fallback = '-') {
  return value === undefined ? fallback : String(value);
}

function formatReminderMeta(reminder: ReminderItem) {
  return `${reminder.ownerName} · ${reminder.scheduledDate}`;
}

function formatReminderTag(reminder: ReminderItem) {
  if (reminder.reminderType === 'overdue') {
    return '逾期';
  }

  return reminder.status === 'pending' ? '待处理' : '提醒';
}

function formatWarningDue(reminder: ReminderItem) {
  if (reminder.reminderType === 'overdue') {
    return `逾期 ${Math.abs(reminder.daysBeforeExpiry)} 天`;
  }

  return `${reminder.daysBeforeExpiry} 天`;
}

function formatWarningRisk(reminder: ReminderItem) {
  if (reminder.reminderType === 'overdue') {
    return '高';
  }

  if (reminder.daysBeforeExpiry <= 7) {
    return '高';
  }

  return reminder.daysBeforeExpiry <= 30 ? '中' : '低';
}

export function MyHomePage() {
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const certificateQuery = useGetCertificatesQuery({
    page: 1,
    pageSize: 100,
    status: 'active',
  });
  const monitorQuery = useGetShipMonitorsQuery({ activeOnly: true });
  const reminderDashboardQuery = useGetReminderDashboardQuery();
  const reminderListQuery = useGetReminderListQuery({
    page: 1,
    pageSize: 5,
    status: 'pending',
  });
  const overdueReminderListQuery = useGetReminderListQuery({
    page: 1,
    pageSize: 5,
    reminderType: 'overdue',
  });
  const workbenchDashboardQuery = useGetWorkbenchDashboardQuery();

  const certificates = certificateQuery.data?.data ?? [];
  const monitors = monitorQuery.data?.data ?? [];
  const reminderDashboard = reminderDashboardQuery.data?.data;
  const pendingReminders = reminderListQuery.data?.data ?? [];
  const overdueReminders = overdueReminderListQuery.data?.data ?? [];
  const workbenchDashboard = workbenchDashboardQuery.data?.data;
  const activeMonitors = monitors.filter((item) => item.isActive);
  const onlineVesselCount = uniqueCount(activeMonitors, (item) => item.vesselId);
  const workbenchAlerts = workbenchDashboard?.alerts ?? [];
  const pendingTotal =
    (reminderDashboard?.totalPending ?? 0) +
    (workbenchDashboard?.pendingTotal ?? 0);
  const warningTotal =
    (reminderDashboard?.totalOverdue ?? 0) +
    (reminderDashboard?.totalPending ?? 0);
  const certificateTotal = certificateQuery.data?.meta?.total ?? certificates.length;
  const displayName = currentUser?.name ?? '当前账号';
  const identity = currentUser?.department?.length
    ? `${currentUser.department.join('、')} · ${currentUser.position ?? '企业微信成员'}`
    : '企业微信成员 · 权限已同步';
  const avatarText = displayName.slice(0, 2).toUpperCase();

  const heroStats = [
    { label: '在线船舶', value: formatCount(onlineVesselCount) },
    { label: '有效证照', value: formatCount(certificateTotal) },
    { label: '今日待办', value: formatCount(pendingTotal) },
    { label: '证照预警', value: formatCount(warningTotal) },
  ];
  const sideStatus = [
    {
      label: '待办审批',
      note: '工作平台审批待处理',
      badge: formatCount(workbenchDashboard?.approvalPendingTotal),
      tone:
        (workbenchDashboard?.approvalPendingTotal ?? 0) > 0
          ? 'danger'
          : 'success',
    },
    {
      label: '证书提醒',
      note: '到期与复核预警',
      badge: formatCount(reminderDashboard?.totalPending),
      tone:
        (reminderDashboard?.totalOverdue ?? 0) > 0 ? 'danger' : 'warning',
    },
    {
      label: '船舶监控',
      note: '启用监控船舶',
      badge: monitorQuery.isLoading ? '加载中' : `${onlineVesselCount} 艘`,
      tone: onlineVesselCount > 0 ? 'success' : 'info',
    },
    { label: '个人设置', note: '权限与认证信息', badge: '进入', tone: 'info' },
  ];
  const todayTasks = [
    ...pendingReminders.map((reminder) => ({
      title: reminder.certificateTitle,
      meta: formatReminderMeta(reminder),
      tone: reminder.reminderType === 'overdue' ? 'danger' : 'warning',
      tag: formatReminderTag(reminder),
    })),
    ...workbenchAlerts.slice(0, 2).map((alert) => ({
      title: alert.message,
      meta: '工作平台 · 实时聚合',
      tone: alert.code === 'approval_pending' ? 'danger' : 'warning',
      tag: '工作台',
    })),
  ].slice(0, 5);
  const warningRows = [
    ...overdueReminders,
    ...pendingReminders.filter((reminder) => reminder.reminderType !== 'overdue'),
  ].slice(0, 5);

  return (
    <div className="my-home-page" data-testid="my-home-page">
      <section className="my-home-command-hero" aria-labelledby="my-home-title">
        <div className="my-home-hero-copy">
          <Typography.Title
            level={1}
            id="my-home-title"
            className="my-home-title"
          >
            常用业务一屏触达，船务状态集中提醒
          </Typography.Title>
          <Typography.Paragraph className="my-home-subtitle">
            围绕证照、制度、船舶监控和个人待办重新组织入口，适配桌面与企业微信移动端。
          </Typography.Paragraph>
          <div className="my-home-stat-strip" aria-label="我的工作台指标">
            {heroStats.map((stat) => (
              <div className="my-home-stat" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="my-home-dashboard">
        <aside className="my-home-side-panel" aria-label="个人工作状态">
          <div className="my-home-profile">
            <span className="my-home-profile-avatar" aria-hidden="true">
              {avatarText}
            </span>
            <div>
              <Typography.Title level={3}>{displayName}</Typography.Title>
              <Typography.Text>{identity}</Typography.Text>
            </div>
          </div>
          <div className="my-home-status-list">
            {sideStatus.map((item) => (
              <div
                className={`my-home-status-item is-${item.tone}`}
                key={item.label}
              >
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </span>
                <em>{item.badge}</em>
              </div>
            ))}
          </div>
        </aside>

        <section
          className="my-home-main-panel"
          aria-labelledby="my-home-modules-title"
        >
          <div className="sunan-panel-heading">
            <Typography.Title level={2} id="my-home-modules-title">
              常用模块
            </Typography.Title>
            <Typography.Text>按使用频率自动排序</Typography.Text>
          </div>
          <div
            className="my-home-grid my-home-card-grid"
            data-testid="my-home-grid"
          >
            {entries.map((entry) => {
              const Icon = entryIcons[entry.path] ?? FileSearchOutlined;

              return (
                <Link
                  to={entry.path}
                  className="my-home-shortcut"
                  data-testid={`my-home-entry-${entry.path.slice(1).replace(/\//g, '-')}`}
                  data-shortcut="true"
                  key={entry.path}
                  aria-label={entry.label}
                >
                  <span
                    className="my-home-shortcut-icon my-home-shortcut-icon-blue"
                    data-testid="my-home-shortcut-icon"
                    aria-hidden="true"
                  >
                    <Icon />
                  </span>
                  <span className="my-home-shortcut-copy">
                    <Typography.Text className="my-home-shortcut-label">
                      {entry.label}
                    </Typography.Text>
                    <Typography.Text className="my-home-shortcut-description">
                      {entry.description}
                    </Typography.Text>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="my-home-right-rail">
          <section
            className="my-home-task-panel"
            aria-labelledby="today-tasks-title"
          >
            <div className="sunan-panel-heading">
              <Typography.Title level={2} id="today-tasks-title">
                今日待办
              </Typography.Title>
              <Typography.Text>{pendingTotal} 项待处理</Typography.Text>
            </div>
            <div className="my-home-task-list">
              {todayTasks.length > 0 ? (
                todayTasks.map((task) => (
                  <article
                    className={`my-home-task-item is-${task.tone}`}
                    key={`${task.tag}:${task.title}`}
                  >
                    <span>
                      <strong>{task.title}</strong>
                      <small>{task.meta}</small>
                    </span>
                    <em>{task.tag}</em>
                  </article>
                ))
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待办" />
              )}
            </div>
          </section>

          <section
            className="my-home-warning-panel"
            aria-labelledby="warning-title"
          >
            <div className="sunan-panel-heading">
              <Typography.Title level={2} id="warning-title">
                证照预警
              </Typography.Title>
              <Typography.Text>按风险等级排序</Typography.Text>
            </div>
            <div className="my-home-warning-table">
              {warningRows.length > 0 ? (
                warningRows.map((row) => (
                  <div className="my-home-warning-row" key={row.id}>
                    <span>{row.certificateTitle}</span>
                    <strong>{formatWarningDue(row)}</strong>
                    <em>{formatWarningRisk(row)}</em>
                  </div>
                ))
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无证照预警"
                />
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
