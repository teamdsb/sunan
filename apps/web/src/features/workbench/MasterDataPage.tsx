import { Alert, Button, Card, Drawer, Empty, Form, Input, List, Segmented, Select, Space, Spin, Tag, Typography, message } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { useAppSelector } from '../../app/hooks';
import { canManageMasterData } from '../auth/permissions';
import {
  useCreateMasterDataEquipmentMutation,
  useCreateMasterDataPersonnelMutation,
  useCreateMasterDataVehicleMutation,
  useCreateMasterDataVesselMutation,
  useGetMasterDataEquipmentQuery,
  useGetMasterDataPersonnelQuery,
  useGetMasterDataSelectorQuery,
  useGetMasterDataVehiclesQuery,
  useGetMasterDataVesselsQuery,
  useUpdateMasterDataEquipmentMutation,
  useUpdateMasterDataPersonnelMutation,
  useUpdateMasterDataVehicleMutation,
  useUpdateMasterDataVesselMutation,
  type MasterDataInput,
  type MasterDataItem,
} from './masterDataApi';

type MasterType = 'vessels' | 'vehicles' | 'personnel' | 'equipment';
const labels: Record<MasterType, string> = { vessels: '船舶', vehicles: '车辆', personnel: '人员', equipment: '设备' };
type FormValues = MasterDataInput & { type: MasterType };

export function MasterDataPage() {
  const [type, setType] = useState<MasterType>('vessels');
  const [keyword, setKeyword] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<MasterDataItem | null>(null);
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const roles = useAppSelector((state) => state.auth.currentUser?.roles ?? []);
  const canManage = canManageMasterData(roles);

  // The maintenance view must retain inactive/retired rows so they can be
  // edited or reactivated; the selector below remains active-only.
  const vessels = useGetMasterDataVesselsQuery({ includeInactive: canManage });
  const vehicles = useGetMasterDataVehiclesQuery({ includeInactive: canManage });
  const personnel = useGetMasterDataPersonnelQuery({ includeInactive: canManage });
  const equipment = useGetMasterDataEquipmentQuery({ includeInactive: canManage });
  const selector = useGetMasterDataSelectorQuery({ type, keyword: keyword || undefined });
  const list = type === 'vessels' ? vessels : type === 'vehicles' ? vehicles : type === 'personnel' ? personnel : equipment;
  const options = useMemo(() => (selector.data?.data ?? []).map((item) => ({ value: item.id, label: `${item.name}${item.code ? ` (${item.code})` : ''}` })), [selector.data]);
  const vesselOptions = useMemo(() => (vessels.data?.data ?? []).map((item) => ({ value: item.id, label: `${item.name}${item.code ? ` (${item.code})` : ''}` })), [vessels.data]);

  const [createVessel] = useCreateMasterDataVesselMutation();
  const [updateVessel] = useUpdateMasterDataVesselMutation();
  const [createPersonnel] = useCreateMasterDataPersonnelMutation();
  const [updatePersonnel] = useUpdateMasterDataPersonnelMutation();
  const [createEquipment] = useCreateMasterDataEquipmentMutation();
  const [updateEquipment] = useUpdateMasterDataEquipmentMutation();
  const [createVehicle] = useCreateMasterDataVehicleMutation();
  const [updateVehicle] = useUpdateMasterDataVehicleMutation();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type, status: 'active' });
    setDrawerOpen(true);
  };
  const openEdit = (item: MasterDataItem) => {
    setEditing(item);
    form.setFieldsValue({ ...item, vehicleType: item.vehicleType ?? undefined, type, employmentStatus: item.employmentStatus ?? item.status });
    setDrawerOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    const { type: _type, ...payload } = values;
    try {
      const mutation = (type === 'vessels' ? (editing ? updateVessel : createVessel) : type === 'vehicles' ? (editing ? updateVehicle : createVehicle) : type === 'personnel' ? (editing ? updatePersonnel : createPersonnel) : (editing ? updateEquipment : createEquipment)) as unknown as ((arg: unknown) => Promise<unknown>) | undefined;
      if (!mutation) throw new Error('主数据维护接口不可用');
      const result = editing ? await mutation({ id: editing.id, data: payload }) : await mutation(payload);
      await (result as unknown as { unwrap: () => Promise<unknown> }).unwrap();
      messageApi.success(`${labels[type]}${editing ? '已更新' : '已新增'}`);
      setDrawerOpen(false);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '保存失败');
    }
  };

  if (list.isError) return <section className="page-hero"><Alert type="error" showIcon message="主数据加载失败" description="请检查网络后重试。" /></section>;
  return <section className="page-hero" data-testid="master-data-page">
    {contextHolder}
    <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
      <div><Typography.Title level={2} style={{ marginBottom: 4 }}>证书对象</Typography.Title><Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>统一维护证照可选择的船舶、车辆、人员和设备对象。</Typography.Paragraph></div>
      {canManage ? <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增{labels[type]}</Button> : null}
    </Space>
    <Space direction="vertical" style={{ width: '100%', marginTop: 20 }}>
      <Segmented block value={type} options={Object.entries(labels).map(([value, label]) => ({ value, label }))} onChange={(value) => { setType(value as MasterType); setKeyword(''); }} />
      <Card title="受控搜索选择器" size="small"><Space direction="vertical" style={{ width: '100%' }}><Input.Search aria-label="搜索主数据" placeholder="按名称或编码搜索，不需输入 UUID" value={keyword} onChange={(event) => setKeyword(event.target.value)} /><Select aria-label="选择主数据" showSearch loading={selector.isLoading} optionFilterProp="label" placeholder={`选择有效${labels[type]}`} options={options} notFoundContent={selector.isLoading ? <Spin size="small" /> : '没有可选择的有效对象'} /></Space></Card>
      <Card title={`${labels[type]}档案`} loading={list.isLoading}>{(list.data?.data ?? []).length ? <List dataSource={list.data?.data} renderItem={(item) => <List.Item actions={canManage ? [<Button key="edit" type="link" icon={<EditOutlined />} onClick={() => openEdit(item)}>编辑</Button>] : undefined}><List.Item.Meta title={item.name} description={item.code ?? item.id} /><Tag color="green">{item.status === 'active' ? '有效' : item.status ?? '有效'}</Tag></List.Item>} /> : <Empty description={`暂无可见${labels[type]}`} />}</Card>
    </Space>
    {canManage ? <Drawer title={`${editing ? '编辑' : '新增'}${labels[type]}`} open={drawerOpen} onClose={() => setDrawerOpen(false)} width={480} extra={<Button type="primary" onClick={() => void submit()}>保存</Button>}>
      <Form form={form} layout="vertical">
        {type === 'vessels' ? <><Form.Item name="code" label="船舶编码" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="name" label="船舶名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="category" label="船舶类别" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="mmsi" label="MMSI"><Input /></Form.Item></> : null}
        {type === 'vehicles' ? <><Form.Item name="plateNumber" label="车牌号" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="vehicleType" label="车辆类型"><Input /></Form.Item></> : null}
        {type === 'personnel' ? <><Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="departmentCode" label="部门编码" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="wecomUserId" label="企业微信成员标识"><Input /></Form.Item><Form.Item name="position" label="职位"><Input /></Form.Item><Form.Item name="mobile" label="手机号"><Input /></Form.Item><Form.Item name="employmentStatus" label="任职状态" initialValue="active"><Select options={[{ value: 'active', label: '在职' }, { value: 'inactive', label: '停用' }, { value: 'left', label: '离职' }]} /></Form.Item></> : null}
        {type === 'equipment' ? <><Form.Item name="code" label="设备编码" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="name" label="设备名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="categoryCode" label="设备类别编码" rules={[{ required: !editing, message: '请输入设备类别编码' }]}><Input placeholder={editing ? '留空表示保持原类别' : undefined} /></Form.Item><Form.Item name="vesselId" label="所属船舶" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={vesselOptions} /></Form.Item><Form.Item name="serialNo" label="序列号"><Input /></Form.Item></> : null}
        {type !== 'personnel' ? <Form.Item name="status" label="状态" initialValue="active"><Select options={[{ value: 'active', label: '有效' }, { value: 'inactive', label: '停用' }, { value: 'retired', label: '报废' }]} /></Form.Item> : null}
        <Form.Item name="remarks" label="备注"><Input.TextArea rows={3} /></Form.Item>
      </Form>
    </Drawer> : null}
  </section>;
}
