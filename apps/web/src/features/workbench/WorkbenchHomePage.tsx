import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  List,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import {
  WorkbenchRecordSummary,
  useGetWorkbenchDashboardQuery,
  useGetWorkbenchRecordQuery,
  useGetWorkbenchRecordsQuery,
} from './workbenchApi';

const departmentLabelMap: Record<string, string> = {
  general_office: '总经办',
  finance: '财务部',
  business: '业务部',
  shipping: '船务部',
  logistics: '后勤部',
  workgroup: '工作组',
};

const templateColorMap: Record<string, string> = {
  ledger_form: 'geekblue',
  operation_flow: 'purple',
  inspection_rectification: 'volcano',
  attendance_statistics: 'green',
  service_asset: 'gold',
  wecom_approval: 'cyan',
};

export function WorkbenchHomePage() {
  const [activeModuleCode, setActiveModuleCode] = useState<string | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);

  const { data: dashboardResponse, isLoading: dashboardLoading } = useGetWorkbenchDashboardQuery();
  const { data: recordsResponse, isLoading: recordsLoading } = useGetWorkbenchRecordsQuery(
    activeModuleCode ? { moduleCode: activeModuleCode, page: 1, pageSize: 10 } : { page: 1, pageSize: 10 },
  );
  const { data: detailResponse, isFetching: detailLoading } = useGetWorkbenchRecordQuery(activeRecordId ?? '', {
    skip: !activeRecordId,
  });

  const dashboard = dashboardResponse?.data;
  const records = recordsResponse?.data ?? [];

  const moduleCards = useMemo(() => dashboard?.modules ?? [], [dashboard?.modules]);

  return (
    <>
      <section className="page-hero">
        <Typography.Title level={2}>工作平台</Typography.Title>
        <Typography.Paragraph type="secondary">
          Wave 2 已完成公共壳层：模块注册、待办聚合、统一记录列表与审批桥基础能力。
        </Typography.Paragraph>
      </section>

      <section className="page-card-grid workbench-stats-grid">
        <Card className="placeholder-card" bordered={false}>
          <Statistic title="当前待办" value={dashboard?.pendingTotal ?? 0} loading={dashboardLoading} />
        </Card>
        <Card className="placeholder-card" bordered={false}>
          <Statistic title="待审批" value={dashboard?.approvalPendingTotal ?? 0} loading={dashboardLoading} />
        </Card>
      </section>

      <section className="page-card-grid">
        {dashboard?.alerts.map((alert) => (
          <Alert key={alert.code} type="info" showIcon message={alert.message} />
        ))}
      </section>

      <section className="page-card-grid workbench-module-grid" data-testid="workbench-module-grid">
        {moduleCards.length === 0 ? (
          <Card className="placeholder-card" bordered={false}>
            <Empty description={dashboardLoading ? '工作平台模块加载中…' : '暂无可访问模块'} />
          </Card>
        ) : (
          moduleCards.map((item) => {
            const selected = activeModuleCode === item.moduleCode;
            return (
              <Card key={item.moduleCode} className="placeholder-card" bordered={false}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Space wrap>
                    <Typography.Title level={4}>{item.moduleName}</Typography.Title>
                    <Tag>{departmentLabelMap[item.departmentCode] ?? item.departmentCode}</Tag>
                    <Tag color={templateColorMap[item.templateType] ?? 'default'}>{item.templateType}</Tag>
                    {item.requiresApproval ? <Tag color="cyan">企业微信审批</Tag> : null}
                  </Space>
                  <Typography.Text type="secondary">待办：{item.pendingCount}</Typography.Text>
                  <Button type={selected ? 'primary' : 'default'} onClick={() => setActiveModuleCode(item.moduleCode)}>
                    {selected ? '已选中' : '查看记录'}
                  </Button>
                </Space>
              </Card>
            );
          })
        )}
      </section>

      <section className="page-card-grid">
        <Card className="placeholder-card" bordered={false}>
          <Typography.Title level={4}>{activeModuleCode ? `模块记录：${activeModuleCode}` : '全部模块记录'}</Typography.Title>
          <Table<WorkbenchRecordSummary>
            rowKey="id"
            loading={recordsLoading}
            dataSource={records}
            pagination={false}
            locale={{ emptyText: '暂无记录' }}
            columns={[
              {
                title: '标题',
                dataIndex: 'title',
                key: 'title',
                render: (_value: string, record) => (
                  <Button type="link" onClick={() => setActiveRecordId(record.id)}>
                    {record.title}
                  </Button>
                ),
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                width: 160,
              },
              {
                title: '审批通道',
                dataIndex: 'approvalChannel',
                key: 'approvalChannel',
                width: 160,
              },
              {
                title: '时间',
                dataIndex: 'occurredAt',
                key: 'occurredAt',
                width: 220,
              },
            ]}
          />
        </Card>
      </section>

      <Drawer
        title="记录详情"
        placement="right"
        width={560}
        open={Boolean(activeRecordId)}
        onClose={() => setActiveRecordId(null)}
      >
        {detailResponse?.data ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Typography.Title level={4}>{detailResponse.data.title}</Typography.Title>
              <Typography.Paragraph>{detailResponse.data.summary}</Typography.Paragraph>
              <Space wrap>
                <Tag>{detailResponse.data.status}</Tag>
                <Tag>{detailResponse.data.approvalChannel}</Tag>
                {detailResponse.data.externalStatus ? <Tag color="cyan">{detailResponse.data.externalStatus}</Tag> : null}
              </Space>
            </div>

            <div>
              <Typography.Title level={5}>步骤</Typography.Title>
              <List
                bordered
                dataSource={detailResponse.data.steps}
                renderItem={(step) => (
                  <List.Item>
                    <Space direction="vertical" size={2}>
                      <Typography.Text strong>{step.stepName}</Typography.Text>
                      <Typography.Text type="secondary">
                        {step.stepCode} / {step.status}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>

            <div>
              <Typography.Title level={5}>附件</Typography.Title>
              <List
                bordered
                dataSource={detailResponse.data.attachments}
                locale={{ emptyText: '暂无附件' }}
                renderItem={(attachment) => (
                  <List.Item>
                    <Space>
                      <Tag>{attachment.category}</Tag>
                      <Typography.Text>{attachment.fileName}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>

            <div>
              <Typography.Title level={5}>操作日志</Typography.Title>
              <List
                bordered
                dataSource={detailResponse.data.actionLogs}
                locale={{ emptyText: '暂无日志' }}
                renderItem={(log) => (
                  <List.Item>
                    <Space direction="vertical" size={2}>
                      <Typography.Text strong>{log.actionType}</Typography.Text>
                      <Typography.Text type="secondary">
                        {log.operatorUserId}：{log.fromStatus} → {log.toStatus}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          </Space>
        ) : (
          <Empty description={detailLoading ? '详情加载中…' : '请选择记录'} />
        )}
      </Drawer>
    </>
  );
}
