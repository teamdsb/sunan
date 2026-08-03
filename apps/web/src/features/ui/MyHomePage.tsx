import {
  BellOutlined,
  CalendarOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  MonitorOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Alert, Typography } from 'antd';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { myRouteNavItems } from '../../router/myRouteConfig';
import { useGetCertificatesQuery } from '../certificate/certificateApi';
import {
  useGetEnterprisePoliciesQuery,
  useGetEnterpriseProfilesQuery,
} from '../enterprise/enterpriseApi';
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

function formatShortcutDescription(
  path: string,
  values: {
    profileTotal?: number;
    policyTotal?: number;
    certificateTotal?: number;
    warningTotal?: number;
    onlineVesselCount?: number;
  },
) {
  const descriptions: Record<string, string> = {
    '/my/enterprise-profile': `企业资料 ${formatCount(values.profileTotal)} 项`,
    '/my/enterprise-policy': `制度文档 ${formatCount(values.policyTotal)} 份`,
    '/my/certificates': `有效证照 ${formatCount(values.certificateTotal)} 张`,
    '/my/reminders': `${formatCount(values.warningTotal)} 项即将到期`,
    '/my/monitors': `${formatCount(values.onlineVesselCount)} 艘在线运行`,
    '/my/settings': '账号与系统设置',
  };

  return descriptions[path] ?? '快速进入';
}

function formatDepartmentLabel(user: { department?: string[]; roles?: string[] } | null) {
  const department = user?.department?.[0];

  if (department && department !== '苏南船舶管理') {
    return department;
  }

  if (user?.roles?.includes('general_office')) {
    return '总经办';
  }

  if (user?.roles?.includes('shipping')) {
    return '船务部';
  }

  return department ?? '总经办';
}

export function MyHomePage() {
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const enterpriseProfileQuery = useGetEnterpriseProfilesQuery({
    page: 1,
    pageSize: 1,
  });
  const enterprisePolicyQuery = useGetEnterprisePoliciesQuery({
    page: 1,
    pageSize: 1,
  });
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
    status: 'pending',
  });
  const workbenchDashboardQuery = useGetWorkbenchDashboardQuery();

  const certificates = certificateQuery.data?.data ?? [];
  const monitors = monitorQuery.data?.data ?? [];
  const reminderDashboard = reminderDashboardQuery.data?.data;
  const pendingReminders = reminderListQuery.data?.data ?? [];
  const overdueReminders = (overdueReminderListQuery.data?.data ?? []).filter(
    (reminder) => reminder.status === 'pending',
  );
  const workbenchDashboard = workbenchDashboardQuery.data?.data;
  const activeMonitors = monitors.filter((item) => item.isActive);
  const onlineVesselCount = monitorQuery.data
    ? uniqueCount(activeMonitors, (item) => item.vesselId)
    : undefined;
  const pendingTotal =
    reminderDashboard && workbenchDashboard
      ? reminderDashboard.totalPending + workbenchDashboard.pendingTotal
      : undefined;
  const warningTotal = reminderDashboard?.totalPending;
  const certificateTotal = certificateQuery.data
    ? certificateQuery.data.meta?.total ?? certificates.length
    : undefined;
  const profileTotal = enterpriseProfileQuery.data
    ? enterpriseProfileQuery.data.meta?.total ?? enterpriseProfileQuery.data.data.length
    : undefined;
  const policyTotal = enterprisePolicyQuery.data
    ? enterprisePolicyQuery.data.meta?.total ?? enterprisePolicyQuery.data.data.length
    : undefined;
  const hasOverviewError = [
    enterpriseProfileQuery,
    enterprisePolicyQuery,
    certificateQuery,
    monitorQuery,
    reminderDashboardQuery,
    reminderListQuery,
    overdueReminderListQuery,
    workbenchDashboardQuery,
  ].some((query) => query.isError);
  const displayName = currentUser?.name ?? '当前账号';
  const departmentLabel = formatDepartmentLabel(currentUser);

  const heroStats = [
    { label: '在线船舶', value: formatCount(onlineVesselCount) },
    { label: '有效证照', value: formatCount(certificateTotal) },
    { label: '当前待办', value: formatCount(pendingTotal) },
    { label: '证照预警', value: formatCount(warningTotal) },
  ];
  const warningRows = [
    ...overdueReminders,
    ...pendingReminders.filter((reminder) => reminder.reminderType !== 'overdue'),
  ].slice(0, 5);
  const todayFocusItems = [
    {
      key: 'approval',
      title: '待办审批',
      meta: '工作平台审批待处理',
      count: formatCount(workbenchDashboard?.approvalPendingTotal),
      tone: 'danger',
      icon: FileTextOutlined,
    },
    {
      key: 'certificate',
      title: '证照预警',
      meta: `${formatCount(warningTotal)} 条需复核`,
      count: formatCount(warningTotal),
      tone: 'warning',
      icon: WarningOutlined,
    },
  ];

  return (
    <div className="my-home-page" data-testid="my-home-page">
      {hasOverviewError ? (
        <Alert
          type="error"
          showIcon
          message="部分首页数据加载失败"
          description="请检查网络后刷新，未加载的数据不会按 0 处理。"
        />
      ) : null}
      <section className="my-home-status-card" aria-labelledby="my-home-title">
        <div className="my-home-profile">
          <span className="my-home-profile-avatar" aria-hidden="true">
            <UserOutlined />
          </span>
          <div className="my-home-profile-copy">
            <Typography.Title level={1} id="my-home-title" className="my-home-title">
              {displayName} · {departmentLabel}
            </Typography.Title>
            <Typography.Paragraph className="my-home-subtitle">
              欢迎使用船舶管理工作台
            </Typography.Paragraph>
          </div>
          <RightOutlined className="my-home-card-chevron" aria-hidden="true" />
        </div>
        <div className="my-home-status-divider" />
        <div className="my-home-stat-strip" aria-label="我的工作台指标">
          {heroStats.slice(0, 3).map((stat, index) => (
            <div className="my-home-stat" key={stat.label}>
              <span className="my-home-stat-icon" aria-hidden="true">
                {index === 0 ? <MonitorOutlined /> : index === 1 ? <SafetyCertificateOutlined /> : <CalendarOutlined />}
              </span>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="my-home-dashboard">
        <section className="my-home-focus-panel" aria-labelledby="current-focus-title">
          <div className="sunan-panel-heading">
            <Typography.Title level={2} id="current-focus-title">
              当前重点
            </Typography.Title>
          </div>
          <div className="my-home-task-list">
            {todayFocusItems.map((task) => {
              const Icon = task.icon;

              return (
                <article className={`my-home-task-item is-${task.tone}`} key={task.key}>
                  <span className="my-home-task-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="my-home-task-copy">
                    <strong>{task.title}</strong>
                    <small>{task.meta}</small>
                  </span>
                  <em>{task.count}</em>
                  <RightOutlined className="my-home-row-chevron" aria-hidden="true" />
                </article>
              );
            })}
          </div>
        </section>

        <section className="my-home-main-panel" aria-labelledby="my-home-modules-title">
          <div className="sunan-panel-heading">
            <Typography.Title level={2} id="my-home-modules-title">
              常用入口
            </Typography.Title>
          </div>
          <div className="my-home-grid my-home-card-grid" data-testid="my-home-grid">
            {entries.map((entry) => {
              const Icon = entryIcons[entry.path] ?? FileSearchOutlined;
              const description = formatShortcutDescription(entry.path, {
                profileTotal,
                policyTotal,
                certificateTotal,
                warningTotal,
                onlineVesselCount,
              });

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
                      {description}
                    </Typography.Text>
                  </span>
                  <RightOutlined className="my-home-row-chevron" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="my-home-warning-panel" aria-labelledby="warning-title">
          <div className="sunan-panel-heading">
            <Typography.Title level={2} id="warning-title">
              证照预警
            </Typography.Title>
            <Typography.Text>按风险等级排序</Typography.Text>
          </div>
          <div className="my-home-warning-table">
            {warningRows.map((row) => (
              <div className="my-home-warning-row" key={row.id}>
                <span>{row.certificateTitle}</span>
                <strong>{formatWarningDue(row)}</strong>
                <em>{formatWarningRisk(row)}</em>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
