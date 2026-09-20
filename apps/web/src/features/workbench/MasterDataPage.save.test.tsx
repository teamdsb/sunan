import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MasterDataPage } from './MasterDataPage';

const createVessel = vi.fn();
const updateVessel = vi.fn();
vi.mock('../../app/hooks', () => ({ useAppSelector: () => ['system_admin'] }));
vi.mock('./masterDataApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('./masterDataApi')>();
  const result: Record<string, unknown> = { ...original };
  for (const key of Object.keys(original)) {
    if (key.endsWith('Query')) result[key] = () => ({ data: { data: [] } });
    if (key.endsWith('Mutation')) result[key] = () => [vi.fn()];
  }
  result.useGetMasterDataVesselsQuery = () => ({
    data: {
      data: [
        {
          id: 'v1',
          code: 'SN012',
          name: '苏南012',
          category: 'main_vessel',
          status: 'active',
        },
      ],
    },
  });
  result.useCreateMasterDataVesselMutation = () => [createVessel];
  result.useUpdateMasterDataVesselMutation = () => [updateVessel];
  return result;
});
// RTK Query unwrap lives on the trigger promise, not on its resolved {data} value.
function triggerResult(data: unknown) {
  return Object.assign(Promise.resolve({ data }), {
    unwrap: () => Promise.resolve(data),
  });
}
describe('master data save results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createVessel.mockReturnValue(triggerResult({ data: { id: 'new' } }));
    updateVessel.mockReturnValue(triggerResult({ data: { id: 'v1' } }));
  });
  it('reports success after a successfully created vessel', async () => {
    render(<MasterDataPage />);
    fireEvent.click(screen.getByRole('button', { name: /新增船舶/ }));
    fireEvent.change(screen.getByRole('textbox', { name: '船舶编码' }), {
      target: { value: 'SN022' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: '船舶名称' }), {
      target: { value: '苏南022' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: '船舶类别' }), {
      target: { value: 'main_vessel' },
    });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(createVessel).toHaveBeenCalled());
    expect(await screen.findByText('船舶已新增')).toBeInTheDocument();
  });
  it('reports success after a successfully edited vessel', async () => {
    render(<MasterDataPage />);
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }));
    fireEvent.change(screen.getByRole('textbox', { name: '船舶名称' }), {
      target: { value: '新船名' },
    });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
    await waitFor(() =>
      expect(updateVessel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'v1',
          data: expect.objectContaining({ name: '新船名' }),
        }),
      ),
    );
    expect(await screen.findByText('船舶已更新')).toBeInTheDocument();
  });
});
