
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAPI } from "@/context/APIContext";
import { api } from "@/utils/apiClient";
import { toast } from "sonner";

interface StatsType {
  activeQueues: number;
  totalServers: number;
  availableServers: number;
  purchaseSuccess: number;
  purchaseFailed: number;
  queueProcessorRunning?: boolean;
  monitorRunning?: boolean;
}

interface QueueItem {
  id: string;
  planCode: string;
  datacenter?: string;
  datacenters?: string[];
  status: string;
  retryCount: number;
  retryInterval: number;
  createdAt: string;
  accountId?: string;
}

const Dashboard = () => {
  const { isAuthenticated, accounts } = useAPI();
  const [stats, setStats] = useState<StatsType>({
    activeQueues: 0,
    totalServers: 0,
    availableServers: 0,
    purchaseSuccess: 0,
    purchaseFailed: 0,
    queueProcessorRunning: true,
    monitorRunning: false,
  });
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fallbackToastShownRef = useRef(false);

  const getAccountLabel = (id?: string) => {
    if (!id) return '默认账户';
    const acc = accounts.find((a: any) => a?.id === id);
    return acc?.alias || id;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, queueResponse] = await Promise.all([
          api.get(`/stats`),
          api.get(`/queue/all`)
        ]);
        setStats(statsResponse.data);
        // 如果服务器总数为0（缓存为空），提示一次后台将从OVH更新
        if (!fallbackToastShownRef.current && isAuthenticated && (statsResponse.data?.totalServers === 0)) {
          fallbackToastShownRef.current = true;
          toast.info('服务器缓存为空，后台将从 OVH 更新，首次加载可能需 1–2 分钟', { duration: 4000 });
        }
        // 只显示活跃的队列项（running, pending, paused），最多3个
        const activeItems = queueResponse.data
          .filter((item: QueueItem) => ['running', 'pending', 'paused'].includes(item.status))
          .slice(0, 3);
        setQueueItems(activeItems);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Set up polling interval
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold mb-1 cyber-glow-text">仪表盘</h1>
        <p className="text-cyber-muted mb-6">OVH 服务器抢购平台状态概览</p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {/* 活跃队列 */}
        <motion.div variants={itemVariants} className="cyber-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 -mr-6 -mt-6 bg-cyber-accent/10 rounded-full blur-xl"></div>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-cyber-muted text-sm mb-1">活跃队列</h3>
              {isLoading ? (
                <div className="h-8 w-16 bg-cyber-grid animate-pulse rounded"></div>
              ) : (
                <p className="text-3xl font-cyber font-bold text-cyber-accent">{stats.activeQueues}</p>
              )}
            </div>
            <div className="p-2 bg-cyber-accent/10 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyber-accent">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                <path d="M9 12h6"></path>
                <path d="M9 16h6"></path>
                <path d="M9 8h6"></path>
              </svg>
            </div>
          </div>
          <div className="mt-4 text-cyber-muted text-xs">
            <Link to="/queue" className="inline-flex items-center hover:text-cyber-accent transition-colors">
              查看队列 
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Link>
          </div>
        </motion.div>

        {/* 服务器总数 */}
        <motion.div variants={itemVariants} className="cyber-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 -mr-6 -mt-6 bg-cyber-neon/10 rounded-full blur-xl"></div>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-cyber-muted text-sm mb-1">服务器总数</h3>
              {isLoading ? (
                <div className="h-8 w-16 bg-cyber-grid animate-pulse rounded"></div>
              ) : (
                <p className="text-3xl font-cyber font-bold text-cyber-neon">{stats.totalServers}</p>
              )}
            </div>
            <div className="p-2 bg-cyber-neon/10 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyber-neon">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                <line x1="6" y1="18" x2="6.01" y2="18"></line>
              </svg>
            </div>
          </div>
          <div className="mt-1 flex items-center text-xs">
            <span className={`inline-flex items-center px-2 py-0.5 rounded ${
              stats.availableServers > 0 
                ? 'text-green-400 bg-green-400/10' 
                : 'text-cyber-muted bg-cyber-grid/30'
            }`}>
              <span className={`w-1.5 h-1.5 mr-1 rounded-full ${
                stats.availableServers > 0 ? 'bg-green-400 animate-pulse' : 'bg-cyber-muted'
              }`}></span>
              可用: {isLoading ? '-' : stats.availableServers}
            </span>
          </div>
          <div className="mt-2 text-cyber-muted text-xs">
            <Link to="/servers" className="inline-flex items-center hover:text-cyber-neon transition-colors">
              查看服务器 
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Link>
          </div>
        </motion.div>

        {/* 抢购成功 */}
        <motion.div variants={itemVariants} className="cyber-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 -mr-6 -mt-6 bg-green-500/10 rounded-full opacity-40"></div>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-cyber-muted text-sm mb-1">抢购成功</h3>
              {isLoading ? (
                <div className="h-8 w-16 bg-cyber-grid animate-pulse rounded"></div>
              ) : (
                <p className="text-3xl font-cyber font-bold text-green-400">{stats.purchaseSuccess}</p>
              )}
            </div>
            <div className="p-2 bg-green-500/10 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
          </div>
          <div className="mt-4 text-cyber-muted text-xs">
            <Link to="/history" className="inline-flex items-center hover:text-green-400 transition-colors">
              查看历史 
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Link>
          </div>
        </motion.div>

        {/* 抢购失败 */}
        <motion.div variants={itemVariants} className="cyber-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 -mr-6 -mt-6 bg-red-500/10 rounded-full opacity-40"></div>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-cyber-muted text-sm mb-1">抢购失败</h3>
              {isLoading ? (
                <div className="h-8 w-16 bg-cyber-grid animate-pulse rounded"></div>
              ) : (
                <p className="text-3xl font-cyber font-bold text-red-400">{stats.purchaseFailed}</p>
              )}
            </div>
            <div className="p-2 bg-red-500/10 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
          </div>
          <div className="mt-4 text-cyber-muted text-xs">
            <Link to="/history" className="inline-flex items-center hover:text-red-400 transition-colors">
              查看失败原因 
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* 最近活动和队列状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* 活跃队列详情 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="cyber-card lg:col-span-2"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-cyber-text">活跃队列</h2>
            <Link 
              to="/queue" 
              className="text-cyber-muted text-xs hover:text-cyber-accent transition-colors"
            >
              查看全部
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-cyber-grid/50 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : stats.activeQueues === 0 ? (
            <div className="bg-cyber-grid/10 p-8 rounded-lg text-center border border-cyber-grid/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyber-muted/50 mx-auto mb-4">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <p className="text-cyber-muted text-base mb-4">暂无活跃任务</p>
              <Link 
                to="/queue" 
                className="cyber-button text-sm inline-flex items-center px-5 py-2.5 gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                创建抢购任务
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {queueItems.map((item) => (
                <div key={item.id} className="p-4 bg-cyber-grid/10 rounded-lg border border-cyber-accent/20 hover:border-cyber-accent/40 hover:bg-cyber-grid/15 transition-all duration-200 flex justify-between items-center group">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base text-cyber-accent truncate group-hover:text-cyber-neon transition-colors">{item.planCode}</p>
                    <div className="flex items-center gap-3 text-sm text-cyber-muted mt-1.5">
                      <span className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyber-accent/60">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span className="ml-2 px-2 py-0.5 text-[11px] bg-cyber-accent/20 text-cyber-accent rounded-full">
                          第 {item.retryCount + 1} 次尝试
                        </span>
                        <span className="text-cyber-grid">•</span>
                        {(() => {
                          const list = Array.isArray(item.datacenters) && item.datacenters.length > 0 ? item.datacenters : (item.datacenter ? [item.datacenter] : []);
                          if (list.length > 1) {
                            return (
                              <span className="px-2 py-0.5 text-[11px] bg-cyber-accent/20 text-cyber-accent rounded-full">
                                机房优先级：{list.map(dc => dc.toUpperCase()).join(' > ')}
                              </span>
                            );
                          }
                          if (list.length === 1) {
                            return (
                              <span className="px-2 py-0.5 text-[11px] bg-cyber-accent/20 text-cyber-accent rounded-full">
                                机房：{list[0].toUpperCase()}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </span>
                      <span className="text-cyber-grid">•</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <span className="px-2 py-0.5 text-[11px] bg-slate-600/30 text-slate-200 rounded-full">
                      账户：{getAccountLabel(item.accountId)}
                    </span>
                    <span className={`text-sm px-3 py-1.5 rounded-lg flex items-center font-medium ${
                      item.status === 'running' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      <span className={`w-2 h-2 mr-2 rounded-full ${
                        item.status === 'running' ? 'bg-green-400 animate-pulse' :
                        item.status === 'pending' ? 'bg-yellow-400' :
                        'bg-gray-400'
                      }`}></span>
                      {item.status === 'running' ? '运行中' :
                       item.status === 'pending' ? '等待中' : '已暂停'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* 系统状态 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className="cyber-card"
        >
          <h2 className="text-lg font-bold mb-5">系统状态</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-cyber-grid/5 hover:bg-cyber-grid/10 transition-colors">
              <span className="text-cyber-text text-sm font-medium">API 连接</span>
              <span className={`flex items-center text-sm font-semibold ${isAuthenticated ? 'text-green-400' : 'text-red-400'}`}>
                <span className={`w-2.5 h-2.5 rounded-full mr-2 ${isAuthenticated ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 'bg-red-400'}`}></span>
                {isAuthenticated ? '已连接' : '未连接'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-cyber-grid/5 hover:bg-cyber-grid/10 transition-colors">
              <span className="text-cyber-text text-sm font-medium">已连接账户</span>
              <span className={`flex items-center text-sm font-semibold ${(accounts?.length || 0) > 0 ? 'text-green-400' : 'text-cyber-muted'}`}>
                <span className={`w-2.5 h-2.5 rounded-full mr-2 ${(accounts?.length || 0) > 0 ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 'bg-cyber-muted'}`}></span>
                {(accounts?.length || 0)} 个
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-cyber-grid/5 hover:bg-cyber-grid/10 transition-colors">
              <span className="text-cyber-text text-sm font-medium">自动抢购</span>
              <span className={`flex items-center text-sm font-semibold ${stats.activeQueues > 0 ? 'text-green-400' : 'text-cyber-muted'}`}>
                <span className={`w-2.5 h-2.5 rounded-full mr-2 ${stats.activeQueues > 0 ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 'bg-cyber-muted'}`}></span>
                {stats.activeQueues > 0 ? '运行中' : '暂无任务'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-cyber-grid/5 hover:bg-cyber-grid/10 transition-colors">
              <span className="text-cyber-text text-sm font-medium">服务器监控</span>
              <span className={`flex items-center text-sm font-semibold ${stats.monitorRunning ? 'text-green-400' : 'text-cyber-muted'}`}>
                <span className={`w-2.5 h-2.5 rounded-full mr-2 ${stats.monitorRunning ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 'bg-cyber-muted'}`}></span>
                {stats.monitorRunning ? '运行中' : '待启用'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-cyber-grid/5 mt-4 border-t border-cyber-grid/30 pt-4">
              <span className="text-cyber-muted text-sm">系统版本</span>
              <span className="text-cyber-text text-sm font-mono font-semibold">v2.0.0</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
