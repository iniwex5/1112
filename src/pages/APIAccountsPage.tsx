import { useEffect, useState } from "react";
import { useAPI } from "@/context/APIContext";
import { api, getApiSecretKey } from "@/utils/apiClient";
import { toast } from "sonner";

const APIAccountsPage = () => {
  const { accounts, currentAccountId, setCurrentAccount, refreshAccounts, accountStatuses, refreshAccountStatuses } = useAPI();
  const [form, setForm] = useState({
    id: "",
    alias: "",
    appKey: "",
    appSecret: "",
    consumerKey: "",
    endpoint: "ovh-eu",
    zone: "IE",
  });
  const [showValues, setShowValues] = useState({ appKey: false, appSecret: false, consumerKey: false });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string>("");

  useEffect(() => {
    (async () => {
      await refreshAccounts();
      await refreshAccountStatuses();
    })();
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleShowValue = (field: 'appKey'|'appSecret'|'consumerKey') => {
    setShowValues(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const fillFromAccount = (acc: any) => {
    setEditingId(acc.id);
    setForm({
      id: acc.id || "",
      alias: acc.alias || "",
      appKey: acc.appKey || "",
      appSecret: acc.appSecret || "",
      consumerKey: acc.consumerKey || "",
      endpoint: acc.endpoint || "ovh-eu",
      zone: acc.zone || "IE",
    });
  };

  const resetForm = () => {
    setEditingId("");
    setForm({ id: "", alias: "", appKey: "", appSecret: "", consumerKey: "", endpoint: "ovh-eu", zone: "IE" });
  };

  const saveAccount = async () => {
    if (!form.appKey || !form.appSecret || !form.consumerKey) {
      toast.error("请填写 APP KEY / APP SECRET / CONSUMER KEY");
      return;
    }
    setSaving(true);
    try {
      // 先自动解析账户ID与别名
      let idVal = form.id;
      let aliasVal = form.alias;
      try {
        const r = await api.post('/accounts/resolve-info', {
          appKey: form.appKey,
          appSecret: form.appSecret,
          consumerKey: form.consumerKey,
          endpoint: form.endpoint || 'ovh-eu'
        });
        if (r.data?.success) {
          idVal = r.data.customerCode || r.data.nichandle || '';
          aliasVal = r.data.email || idVal || '';
        }
      } catch {}

      const payload = { ...form, id: idVal, alias: aliasVal };
      const res = await api.post('/accounts', payload);
      if (res.data?.success) {
        toast.success("账户已保存");
        await refreshAccounts();
        try { await setCurrentAccount(idVal); } catch {}
        resetForm();
      } else {
        const msg = res.data?.error || "保存失败";
        const m = typeof msg === 'string' ? msg.match(/OVH-Query-ID:\s*([^\s]+)/) : null;
        toast.error(m ? `保存失败：${msg} · QueryID: ${m[1]}` : `保存失败：${msg}`);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "保存失败";
      const m = typeof msg === 'string' ? msg.match(/OVH-Query-ID:\s*([^\s]+)/) : null;
      toast.error(m ? `保存失败：${msg} · QueryID: ${m[1]}` : `保存失败：${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const res = await api.delete(`/accounts/${id}`);
      if (res.data?.success) {
        toast.success("账户已删除");
        await refreshAccounts();
        if (currentAccountId === id) setCurrentAccount("");
      } else {
        toast.error(res.data?.error || "删除失败");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || e.message || "删除失败");
    }
  };

  const setDefault = async (id: string) => {
    try {
      const res = await api.put('/accounts/default', { id });
      if (res.data?.success) {
        toast.success("默认账户已设置");
        await refreshAccounts();
      } else {
        toast.error(res.data?.error || "设置失败");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || e.message || "设置失败");
    }
  };


  return (
    <div className="space-y-6">
      {!getApiSecretKey() && (
        <div className="cyber-panel p-4 bg-red-500/10 border border-red-500/30 text-sm">
          为确保安全，请先在“API设置”页配置访问密钥（API Secret Key），否则无法读取或保存账户。
        </div>
      )}
      <div>
        <h1 className="text-3xl font-bold mb-1 cyber-glow-text">API账户管理</h1>
        <p className="text-cyber-muted">管理多个 OVH API 账户的凭据与区域</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="cyber-panel p-5 space-y-4">

            <div className="pt-1">
              <h2 className="text-xl font-bold mb-2">OVH API 凭据</h2>
              <div className="space-y-2">
                <div>
                  <label className="block text-cyber-muted mb-0.5 text-xs sm:text-sm">应用密钥 (APP KEY)</label>
                  <div className="relative">
                    <input
                      type={showValues.appKey ? 'text' : 'password'}
                      name="appKey"
                      value={form.appKey}
                      onChange={onChange}
                      className="cyber-input w-full pr-10 text-sm"
                      placeholder="xxxxxxxxxxxxxxxx"
                    />
                    <button type="button" onClick={() => toggleShowValue('appKey')} className="absolute inset-y-0 right-0 px-3 text-cyber-muted hover:text-cyber-accent">
                      {showValues.appKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-cyber-muted mb-0.5">应用密钥 (APP SECRET)</label>
                  <div className="relative">
                    <input
                      type={showValues.appSecret ? 'text' : 'password'}
                      name="appSecret"
                      value={form.appSecret}
                      onChange={onChange}
                      className="cyber-input w-full pr-10"
                      placeholder="xxxxxxxxxxxxxxxx"
                    />
                    <button type="button" onClick={() => toggleShowValue('appSecret')} className="absolute inset-y-0 right-0 px-3 text-cyber-muted hover:text-cyber-accent">
                      {showValues.appSecret ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-cyber-muted mb-0.5">消费者密钥 (CONSUMER KEY)</label>
                  <div className="relative">
                    <input
                      type={showValues.consumerKey ? 'text' : 'password'}
                      name="consumerKey"
                      value={form.consumerKey}
                      onChange={onChange}
                      className="cyber-input w-full pr-10"
                      placeholder="xxxxxxxxxxxxxxxx"
                    />
                    <button type="button" onClick={() => toggleShowValue('consumerKey')} className="absolute inset-y-0 right-0 px-3 text-cyber-muted hover:text-cyber-accent">
                      {showValues.consumerKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-cyber-muted mb-0.5">API 节点 (ENDPOINT)</label>
                  <select name="endpoint" value={form.endpoint} onChange={onChange} className="cyber-input w-full">
                    <option value="ovh-eu">🇪🇺 欧洲 (ovh-eu) - eu.api.ovh.com</option>
                    <option value="ovh-us">🇺🇸 美国 (ovh-us) - api.us.ovhcloud.com</option>
                    <option value="ovh-ca">🇨🇦 加拿大 (ovh-ca) - ca.api.ovh.com</option>
                  </select>
                  <p className="text-xs text-cyan-400 mt-1">⚠️ 请选择与您OVH账户所在区域匹配的节点</p>
                </div>
              </div>
            </div>

            <div className="cyber-grid-line pt-4">
              <h2 className="text-xl font-bold mb-3">区域设置</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-cyber-muted mb-0.5">OVH 子公司 (ZONE)</label>
                  <p className="text-xs text-cyber-muted mb-1">默认: IE (欧洲区), CA (加拿大), US (美国)</p>
                  <select name="zone" value={form.zone} onChange={onChange} className="cyber-input w-full">
                    <option value="IE">爱尔兰 (IE)</option>
                    <option value="FR">法国 (FR)</option>
                    <option value="GB">英国 (GB)</option>
                    <option value="DE">德国 (DE)</option>
                    <option value="ES">西班牙 (ES)</option>
                    <option value="PT">葡萄牙 (PT)</option>
                    <option value="IT">意大利 (IT)</option>
                    <option value="PL">波兰 (PL)</option>
                    <option value="FI">芬兰 (FI)</option>
                    <option value="LT">立陶宛 (LT)</option>
                    <option value="CZ">捷克 (CZ)</option>
                    <option value="NL">荷兰 (NL)</option>
                    <option value="CA">加拿大 (CA)</option>
                    <option value="US">美国 (US)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={saveAccount} disabled={saving} className="cyber-button w-full">{saving ? '保存中...' : '保存账户'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="cyber-panel p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">账户列表</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-cyber-muted">当前账户</label>
                <select
                  className="text-xs bg-cyber-bg/50 border border-cyber-accent/30 rounded px-2 py-1 text-cyber-text"
                  value={currentAccountId || ''}
                  onChange={(e) => setCurrentAccount(e.target.value)}
                  disabled={accounts.length === 0}
                >
                  {accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>{acc.alias || acc.id}</option>
                  ))}
                </select>
                
              </div>
            </div>

            {accounts.length === 0 && (
              <div className="text-sm text-cyber-muted">暂无账户</div>
            )}
            <div className="space-y-2">
              {accounts.map((acc: any) => (
                <div key={acc.id} className="flex items-center justify-between p-2 rounded border border-cyber-accent/30 bg-cyber-bg/30">
                  <div className="text-sm">
                    <div className="font-medium flex items-center gap-2">
                      <span>{acc.alias || acc.id}</span>
                      {(() => {
                        const hasCreds = !!(acc.appKey && acc.appSecret && acc.consumerKey);
                        if (!hasCreds) {
                          return <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">未配置</span>;
                        }
                        const st = accountStatuses[acc.id];
                        if (!st) return <span className="text-xs text-cyber-muted">检测中...</span>;
                        return st.valid
                          ? <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">已连接</span>
                          : <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400" title={st.error || ''}>未连接</span>;
                      })()}
                    </div>
                    <div className="text-cyber-muted">{acc.endpoint} · {acc.zone}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="cyber-button" onClick={() => setCurrentAccount(acc.id)}>切换</button>
                    <button className="cyber-button" onClick={() => fillFromAccount(acc)}>编辑</button>
                    <button className="cyber-button" onClick={() => deleteAccount(acc.id)}>删除</button>
                  </div>
                </div>
              ))}
            </div>

            
          </div>
        </div>
      </div>
      <div className="cyber-panel p-6 space-y-4">
        <h2 className="text-lg font-bold mb-2">获取 OVH API 密钥</h2>
        <p className="text-cyber-muted text-sm">您需要从 OVH API 控制台获取 APP KEY、APP SECRET 和 CONSUMER KEY 才能使用本服务。</p>
        <div className="space-y-2">
          <p className="text-xs text-cyber-muted font-semibold mb-2">选择您的区域：</p>
          <div className="flex flex-wrap items-center gap-2">
            <a href="https://eu.api.ovh.com/createToken/" target="_blank" rel="noopener noreferrer" className="cyber-button text-xs inline-flex items-center h-8 px-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 flex-shrink-0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              🇪🇺 欧洲 (ovh-eu)
            </a>
            <a href="https://api.us.ovhcloud.com/createToken/" target="_blank" rel="noopener noreferrer" className="cyber-button text-xs inline-flex items-center h-8 px-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 flex-shrink-0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              🇺🇸 美国 (ovh-us)
            </a>
            <a href="https://ca.api.ovh.com/createToken/" target="_blank" rel="noopener noreferrer" className="cyber-button text-xs inline-flex items-center h-8 px-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 flex-shrink-0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              🇨🇦 加拿大 (ovh-ca)
            </a>
          </div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-3">
          <p className="text-xs text-blue-300 font-semibold mb-1">重要提示</p>
          <ul className="text-xs text-blue-200 space-y-1">
            <li>• 美国区请选择 <code className="bg-blue-500/20 px-1 py-0.5 rounded">ovh-us</code> 并访问 api.us.ovhcloud.com</li>
            <li>• Endpoint值请填写 ovh-eu / ovh-us / ovh-ca（不是完整URL）</li>
            <li>• Zone值对应填写 IE / US / CA</li>
          </ul>
        </div>
        <div className="cyber-grid-line pt-4">
          <h3 className="font-medium mb-2">所需权限 (Rights)</h3>
          <p className="text-xs text-cyan-400 mb-3">在 OVH 创建 Token 时，请为每个 HTTP 方法添加 <code className="bg-cyan-500/20 px-1 py-0.5 rounded">/*</code> 完全放开权限：</p>
          <div className="text-cyber-muted text-sm space-y-2 bg-cyber-dark/50 p-3 rounded border border-cyber-accent/20">
            <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <div className="font-mono text-cyber-accent font-semibold">GET</div>
              <div className="font-mono">/*</div>
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <div className="font-mono text-cyber-accent font-semibold">POST</div>
              <div className="font-mono">/*</div>
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <div className="font-mono text-cyber-accent font-semibold">PUT</div>
              <div className="font-mono">/*</div>
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <div className="font-mono text-cyber-accent font-semibold">DELETE</div>
              <div className="font-mono">/*</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIAccountsPage;
