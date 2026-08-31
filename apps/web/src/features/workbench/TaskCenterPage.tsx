import { Button, Calendar, Empty, List, Segmented, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { workbenchRouteConfig } from '../../router/workbenchRouteConfig';
import { formatShanghaiDateTime } from '../../utils/dateTime';
import { useGetTasksQuery } from './taskApi';

const tabs = [
  { label: '待办', value: 'todo' },
  { label: '我发起', value: 'initiated' },
  { label: '我参与', value: 'participated' },
  { label: '已完成', value: 'completed' },
  { label: '逾期', value: 'overdue' },
];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function shanghaiMonthRange(year: number, month: number) {
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    startAt: new Date(`${year}-${pad(month)}-01T00:00:00+08:00`).toISOString(),
    endAt: new Date(`${nextYear}-${pad(nextMonth)}-01T00:00:00+08:00`).toISOString(),
  };
}

function currentShanghaiMonth() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric',
    }).formatToParts(new Date()).map((part) => [part.type, part.value]),
  );
  return shanghaiMonthRange(Number(parts.year), Number(parts.month));
}

function shanghaiDateKey(value: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function TaskCenterPage() {
  const [view, setView] = useState('todo');
  const [mode, setMode] = useState<'list' | 'calendar'>('list');
  const [range, setRange] = useState(currentShanghaiMonth);
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetTasksQuery({
    view,
    ...(mode === 'calendar' ? { ...range, pageSize: 100 } : {}),
  });
  const tasks = data?.data ?? [];

  return (
    <section className="workbench-page">
      <Typography.Title level={2}>安全任务中心</Typography.Title>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Segmented options={tabs} value={view} onChange={(value) => setView(String(value))} />
        <Segmented
          options={[{ label: '列表', value: 'list' }, { label: '日历', value: 'calendar' }]}
          value={mode}
          onChange={(value) => setMode(value as 'list' | 'calendar')}
        />
        {isLoading ? <Typography.Text>任务加载中...</Typography.Text> : isError ? (
          <Typography.Text type="danger">任务加载失败，请重试。</Typography.Text>
        ) : mode === 'calendar' ? (
          <Calendar
            fullscreen={false}
            onChange={(date) => setRange(shanghaiMonthRange(date.year(), date.month() + 1))}
            cellRender={(date, info) => {
              if (info.type !== 'date') return info.originNode;
              const dateKey = date.format('YYYY-MM-DD');
              const items = tasks.filter((task) => shanghaiDateKey(task.scheduledAt) === dateKey);
              return items.length ? (
                <Space direction="vertical" size={0}>
                  {items.slice(0, 2).map((task) => (
                    <Button key={task.id} type="link" size="small" onClick={() => navigate(workbenchRouteConfig.taskDetail.buildPath(task.id))}>
                      {task.title}
                    </Button>
                  ))}
                  {items.length > 2 && <Tag color="blue">{items.length} 项</Tag>}
                </Space>
              ) : info.originNode;
            }}
          />
        ) : tasks.length ? (
          <List dataSource={tasks} renderItem={(task) => (
            <List.Item actions={[<Button key="detail" type="link" onClick={() => navigate(workbenchRouteConfig.taskDetail.buildPath(task.id))}>查看</Button>]}>
              <List.Item.Meta title={<Link to={workbenchRouteConfig.taskDetail.buildPath(task.id)}>{task.title}</Link>} description={`期限：${formatShanghaiDateTime(task.dueAt)}`} />
              <Tag color={task.isOverdue ? 'red' : task.status === 'completed' ? 'green' : 'blue'}>{task.isOverdue ? '逾期' : task.status}</Tag>
            </List.Item>
          )} />
        ) : <Empty description="当前范围没有真实任务" />}
      </Space>
    </section>
  );
}
