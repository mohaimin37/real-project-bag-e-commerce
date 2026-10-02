import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { formatDate, formatINR, initials } from '../lib/format';
import { countryByCode } from '../lib/countries';
import { Badge, EmptyState, Pagination } from '../components/ui';
import { DataTable, FilterSelect, PageHeader, SearchBox, Toolbar, useListParams } from './kit';

export default function Customers() {
  const [p, set] = useListParams({ page: '1' });
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ['admin', 'customers', p], queryFn: () => adminApi.customers({ ...p, limit: 15 }), placeholderData: keepPreviousData });
  const columns = [
    {
      key: 'name',
      header: 'Customer',
      render: (u) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <span className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-fixed text-label-md flex items-center justify-center shrink-0">{initials(u.name)}</span>
          <div className="min-w-0">
            <p className="text-label-lg truncate flex items-center gap-2">{u.name} {u.role === 'admin' && <Badge tone="dark">Admin</Badge>} {!u.isActive && <Badge tone="danger">Blocked</Badge>}</p>
            <p className="text-label-sm font-normal text-outline truncate">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (u) => <span className="whitespace-nowrap">{u.phone?.number ? `${u.phone.dialCode} ${u.phone.number}` : '—'}</span> },
    { key: 'country', header: 'Country', render: (u) => <span className="whitespace-nowrap">{countryByCode(u.country)?.flag} {countryByCode(u.country)?.name}</span> },
    { key: 'orders', header: 'Orders', align: 'right', render: (u) => u.orders },
    { key: 'spent', header: 'Lifetime value', align: 'right', render: (u) => <span className="text-label-lg">{formatINR(u.spent)}</span> },
    { key: 'joined', header: 'Joined', render: (u) => <span className="whitespace-nowrap text-on-surface-variant">{formatDate(u.createdAt)}</span> },
  ];
  return (
    <>
      <PageHeader title="Customers" subtitle={query.data ? `${query.data.total} accounts` : ' '} />
      <Toolbar>
        <SearchBox value={p.q} onChange={(q) => set({ q })} placeholder="Name, email or phone…" />
        <FilterSelect label="Role" value={p.role} onChange={(v) => set({ role: v })} options={[['', 'All roles'], ['customer', 'Customers'], ['admin', 'Admins']]} />
        <FilterSelect label="Status" value={p.status} onChange={(v) => set({ status: v })} options={[['', 'Any status'], ['active', 'Active'], ['blocked', 'Blocked']]} />
      </Toolbar>
      <DataTable columns={columns} rows={query.data?.items || []} loading={query.isLoading} error={query.error} onRetry={query.refetch} onRowClick={(u) => navigate(`/admin/customers/${u._id}`)} empty={<EmptyState icon="group" title="No customers found" />} />
      <Pagination className="mt-space-md" page={query.data?.page} pages={query.data?.pages} onChange={(page) => set({ page })} />
    </>
  );
}
