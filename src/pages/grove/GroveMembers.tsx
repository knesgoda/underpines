import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Member {
  id: string;
  handle: string;
  display_name: string;
  created_at: string;
  header_image_url: string | null;
  age_bracket: string | null;
}

const GroveMembers = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      setTotal(count ?? 0);

      let query = supabase.from('profiles').select('id, handle, display_name, created_at, header_image_url, age_bracket').order('created_at', { ascending: false }).limit(100);

      if (search) {
        query = query.or(`handle.ilike.%${search}%,display_name.ilike.%${search}%`);
      }

      const { data } = await query;
      setMembers((data as Member[]) || []);
      setLoading(false);
    };
    load();
  }, [search]);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-xl font-bold text-[hsl(var(--pine-pale))]">
        Members <span className="text-sm font-normal text-[hsl(var(--muted-text))]">({total})</span>
      </h1>

      <div className="flex gap-2">
        <Input
          placeholder="Search by name or handle…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light))] placeholder:text-[hsl(var(--muted-text))] text-sm"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32 bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light))] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
            <SelectItem value="all" className="text-[hsl(var(--pine-light))]">All</SelectItem>
            <SelectItem value="active" className="text-[hsl(var(--pine-light))]">Active</SelectItem>
            <SelectItem value="suspended" className="text-[hsl(var(--pine-light))]">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-[hsl(var(--pine-light)/0.5)]">Loading…</p>
      ) : (
        <div className="space-y-1">
          {members.map(m => (
            <div
              key={m.id}
              onClick={() => navigate(`/grove/members/${m.handle}`)}
              className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-[hsl(var(--pine-mid)/0.15)] transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-[hsl(var(--pine-mid)/0.3)] flex items-center justify-center text-xs text-[hsl(var(--pine-light)/0.5)]">
                {m.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[hsl(var(--pine-pale))] truncate">{m.handle}</p>
                <p className="text-xs text-[hsl(var(--muted-text))]">
                  {m.display_name} · Joined {new Date(m.created_at!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroveMembers;
