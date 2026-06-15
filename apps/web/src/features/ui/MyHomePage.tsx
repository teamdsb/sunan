import {
  BellOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  MonitorOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Typography } from 'antd';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { myRouteNavItems } from '../../router/myRouteConfig';

const entries = myRouteNavItems.filter((item) => item.path !== '/my');

const entryIcons: Record<string, ComponentType> = {
  '/my/enterprise-profile': FileSearchOutlined,
  '/my/enterprise-policy': FileProtectOutlined,
  '/my/certificates': SafetyCertificateOutlined,
  '/my/reminders': BellOutlined,
  '/my/monitors': MonitorOutlined,
  '/my/settings': SettingOutlined,
};

const heroStats = [
  { label: '在线船舶', value: '16' },
  { label: '有效证照', value: '284' },
  { label: '本周审批', value: '27' },
  { label: '预警闭环', value: '92%' },
] as const;

const sideStatus = [
  { label: '待办审批', note: '今日需处理事项', badge: '3', tone: 'danger' },
  { label: '证书提醒', note: '到期与复核预警', badge: '8', tone: 'warning' },
  { label: '船舶监控', note: '在线船舶与异常', badge: '正常', tone: 'success' },
  { label: '个人设置', note: '权限与认证信息', badge: '进入', tone: 'info' },
] as const;

const todayTasks = [
  { title: '苏南 16 号船检证书复核', meta: '船务部 · 今天 17:30 前', tone: 'danger', tag: '紧急' },
  { title: '总经办年度培训计划审批', meta: '总经办 · 待确认预算', tone: 'warning', tag: '审批' },
  { title: '企业微信上线配置校验', meta: '信息化 · OAuth2 与 JS 域名', tone: 'success', tag: '核验' },
] as const;

const warningRows = [
  { item: '船舶营运证', due: '12 天', risk: '高' },
  { item: '安全管理证书', due: '28 天', risk: '中' },
] as const;

export function MyHomePage() {
  return (
    <div className="my-home-page" data-testid="my-home-page">
      <section className="my-home-command-hero" aria-labelledby="my-home-title">
        <div className="my-home-hero-copy">
          <Typography.Title level={1} id="my-home-title" className="my-home-title">
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
            <span className="my-home-profile-avatar" aria-hidden="true">OA</span>
            <div>
              <Typography.Title level={3}>当前账号</Typography.Title>
              <Typography.Text>企业微信成员 · 权限已同步</Typography.Text>
            </div>
          </div>
          <div className="my-home-status-list">
            {sideStatus.map((item) => (
              <div className={`my-home-status-item is-${item.tone}`} key={item.label}>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </span>
                <em>{item.badge}</em>
              </div>
            ))}
          </div>
        </aside>

        <section className="my-home-main-panel" aria-labelledby="my-home-modules-title">
          <div className="sunan-panel-heading">
            <Typography.Title level={2} id="my-home-modules-title">
              常用模块
            </Typography.Title>
            <Typography.Text>按使用频率自动排序</Typography.Text>
          </div>
          <div className="my-home-grid my-home-card-grid" data-testid="my-home-grid">
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
                  <span className="my-home-shortcut-icon my-home-shortcut-icon-blue" data-testid="my-home-shortcut-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="my-home-shortcut-copy">
                    <Typography.Text className="my-home-shortcut-label">{entry.label}</Typography.Text>
                    <Typography.Text className="my-home-shortcut-description">{entry.description}</Typography.Text>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="my-home-right-rail">
          <section className="my-home-task-panel" aria-labelledby="today-tasks-title">
            <div className="sunan-panel-heading">
              <Typography.Title level={2} id="today-tasks-title">
                今日待办
              </Typography.Title>
              <Typography.Text>3 项待处理</Typography.Text>
            </div>
            <div className="my-home-task-list">
              {todayTasks.map((task) => (
                <article className={`my-home-task-item is-${task.tone}`} key={task.title}>
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.meta}</small>
                  </span>
                  <em>{task.tag}</em>
                </article>
              ))}
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
                <div className="my-home-warning-row" key={row.item}>
                  <span>{row.item}</span>
                  <strong>{row.due}</strong>
                  <em>{row.risk}</em>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
