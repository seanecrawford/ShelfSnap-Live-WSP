// components/DashboardStats.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle,
  ShoppingCart,
  BarChart3,
  Clock,
  RefreshCw,
  Store,
  Calendar,
  FileText,
  Loader2
} from 'lucide-react';

const DashboardStats = ({ storeId = null, autoRefresh = true, refreshInterval = 30000 }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Main statistics state
  const [stats, setStats] = useState({
    totalScans: 0,
    totalProducts: 0,
    uniqueProducts: 0,
    complianceRate: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    overstockCount: 0,
    perfectShelfCount: 0,
    avgProductsPerScan: 0,
    scanTrend: 'stable', // 'up', 'down', 'stable'
    complianceTrend: 'stable'
  });
  
  // Time-based statistics
  const [timeStats, setTimeStats] = useState({
    today: { scans: 0, products: 0, compliance: 0 },
    yesterday: { scans: 0, products: 0, compliance: 0 },
    thisWeek: { scans: 0, products: 0, compliance: 0 },
    lastWeek: { scans: 0, products: 0, compliance: 0 },
    thisMonth: { scans: 0, products: 0, compliance: 0 },
    lastMonth: { scans: 0, products: 0, compliance: 0 }
  });
  
  // Recent scans for activity feed
  const [recentScans, setRecentScans] = useState([]);
  
  // Store information
  const [storeInfo, setStoreInfo] = useState(null);
  
  // Calculate date ranges
  const getDateRanges = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setMilliseconds(lastWeekEnd.getMilliseconds() - 1);
    
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    return {
      today: today.toISOString(),
      yesterday: yesterday.toISOString(),
      tomorrow: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      thisWeekStart: thisWeekStart.toISOString(),
      lastWeekStart: lastWeekStart.toISOString(),
      lastWeekEnd: lastWeekEnd.toISOString(),
      thisMonthStart: thisMonthStart.toISOString(),
      lastMonthStart: lastMonthStart.toISOString(),
      lastMonthEnd: lastMonthEnd.toISOString()
    };
  }, []);
  
  // Fetch comprehensive statistics
  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const dates = getDateRanges();
      
      // Build query
      let query = supabase
        .from('shelf_scans')
        .select('*', { count: 'exact' });
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      if (user) {
        query = query.eq('user_id', user.id);
      }
      
      // Fetch all scans
      const { data: allScans, count, error: scansError } = await query;
      
      if (scansError) throw scansError;
      
      // Calculate main statistics
      let totalProducts = 0;
      let uniqueProductSet = new Set();
      let outOfStock = 0;
      let lowStock = 0;
      let overstock = 0;
      let perfectShelves = 0;
      let totalCompliance = 0;
      let complianceCount = 0;
      
      // Process each scan
      allScans?.forEach(scan => {
        const scanStats = scan.stats || {};
        const detections = scan.detections || [];
        
        // Count products
        totalProducts += detections.length;
        
        // Track unique products
        detections.forEach(det => {
          if (det.sku) uniqueProductSet.add(det.sku);
          if (det.label) uniqueProductSet.add(det.label);
        });
        
        // Stock status
        outOfStock += scanStats.outOfStock || 0;
        lowStock += scanStats.lowStock || 0;
        overstock += scanStats.overstock || 0;
        
        // Compliance
        if (scanStats.complianceRate !== undefined) {
          totalCompliance += scanStats.complianceRate;
          complianceCount++;
        }
        
        // Perfect shelves (100% compliance)
        if (scanStats.complianceRate >= 100) {
          perfectShelves++;
        }
      });
      
      // Calculate averages
      const avgCompliance = complianceCount > 0 
        ? (totalCompliance / complianceCount).toFixed(1) 
        : 0;
      
      const avgProductsPerScan = count > 0 
        ? Math.round(totalProducts / count) 
        : 0;
      
      // Calculate time-based statistics
      const todayScans = allScans?.filter(scan => 
        new Date(scan.created_at) >= new Date(dates.today)
      ) || [];
      
      const yesterdayScans = allScans?.filter(scan => {
        const scanDate = new Date(scan.created_at);
        return scanDate >= new Date(dates.yesterday) && scanDate < new Date(dates.today);
      }) || [];
      
      const thisWeekScans = allScans?.filter(scan =>
        new Date(scan.created_at) >= new Date(dates.thisWeekStart)
      ) || [];
      
      const lastWeekScans = allScans?.filter(scan => {
        const scanDate = new Date(scan.created_at);
        return scanDate >= new Date(dates.lastWeekStart) && scanDate < new Date(dates.thisWeekStart);
      }) || [];
      
      const thisMonthScans = allScans?.filter(scan =>
        new Date(scan.created_at) >= new Date(dates.thisMonthStart)
      ) || [];
      
      const lastMonthScans = allScans?.filter(scan => {
        const scanDate = new Date(scan.created_at);
        return scanDate >= new Date(dates.lastMonthStart) && scanDate <= new Date(dates.lastMonthEnd);
      }) || [];
      
      // Calculate trends
      const scanTrend = todayScans.length > yesterdayScans.length ? 'up' 
        : todayScans.length < yesterdayScans.length ? 'down' 
        : 'stable';
      
      const todayCompliance = calculateAverageCompliance(todayScans);
      const yesterdayCompliance = calculateAverageCompliance(yesterdayScans);
      const complianceTrend = todayCompliance > yesterdayCompliance ? 'up'
        : todayCompliance < yesterdayCompliance ? 'down'
        : 'stable';
      
      // Update main stats
      setStats({
        totalScans: count || 0,
        totalProducts,
        uniqueProducts: uniqueProductSet.size,
        complianceRate: avgCompliance,
        outOfStockCount: outOfStock,
        lowStockCount: lowStock,
        overstockCount: overstock,
        perfectShelfCount: perfectShelves,
        avgProductsPerScan,
        scanTrend,
        complianceTrend
      });
      
      // Update time stats
      setTimeStats({
        today: {
          scans: todayScans.length,
          products: countProducts(todayScans),
          compliance: calculateAverageCompliance(todayScans)
        },
        yesterday: {
          scans: yesterdayScans.length,
          products: countProducts(yesterdayScans),
          compliance: calculateAverageCompliance(yesterdayScans)
        },
        thisWeek: {
          scans: thisWeekScans.length,
          products: countProducts(thisWeekScans),
          compliance: calculateAverageCompliance(thisWeekScans)
        },
        lastWeek: {
          scans: lastWeekScans.length,
          products: countProducts(lastWeekScans),
          compliance: calculateAverageCompliance(lastWeekScans)
        },
        thisMonth: {
          scans: thisMonthScans.length,
          products: countProducts(thisMonthScans),
          compliance: calculateAverageCompliance(thisMonthScans)
        },
        lastMonth: {
          scans: lastMonthScans.length,
          products: countProducts(lastMonthScans),
          compliance: calculateAverageCompliance(lastMonthScans)
        }
      });
      
      // Get recent scans for activity feed
      const recent = allScans
        ?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5) || [];
      setRecentScans(recent);
      
      // Fetch store information if needed
      if (storeId && !storeInfo) {
        const { data: store } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single();
        
        if (store) {
          setStoreInfo(store);
        }
      }
      
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId, user, getDateRanges, storeInfo]);
  
  // Helper functions
  const countProducts = (scans) => {
    return scans.reduce((total, scan) => {
      return total + (scan.detections?.length || 0);
    }, 0);
  };
  
  const calculateAverageCompliance = (scans) => {
    if (!scans || scans.length === 0) return 0;
    
    const total = scans.reduce((sum, scan) => {
      return sum + (scan.stats?.complianceRate || 0);
    }, 0);
    
    return (total / scans.length).toFixed(1);
  };
  
  // Set up real-time subscription
  useEffect(() => {
    // Initial fetch
    fetchStats();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`dashboard-stats-${storeId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shelf_scans',
          filter: storeId ? `store_id=eq.${storeId}` : undefined
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          fetchStats(); // Refetch stats on any change
        }
      )
      .subscribe();
    
    // Set up auto-refresh if enabled
    let refreshTimer;
    if (autoRefresh && refreshInterval > 0) {
      refreshTimer = setInterval(() => {
        setRefreshing(true);
        fetchStats();
      }, refreshInterval);
    }
    
    // Cleanup
    return () => {
      channel.unsubscribe();
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [storeId, fetchStats, autoRefresh, refreshInterval]);
  
  // Manual refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };
  
  // Format time ago
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };
  
  // Render trend icon
  const renderTrend = (trend, value) => {
    if (trend === 'up') {
      return (
        <div className="flex items-center text-green-600">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span className="text-sm">{value}%</span>
        </div>
      );
    } else if (trend === 'down') {
      return (
        <div className="flex items-center text-red-600">
          <TrendingDown className="h-4 w-4 mr-1" />
          <span className="text-sm">{value}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center text-gray-500">
        <span className="text-sm">No change</span>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={handleRefresh}
            className="ml-auto px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Statistics</h2>
          {storeInfo && (
            <p className="text-sm text-gray-600 mt-1">
              <Store className="inline h-4 w-4 mr-1" />
              {storeInfo.name}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Updated {formatTimeAgo(lastUpdated)}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scans */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Scans</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalScans}</p>
              <div className="mt-2">
                {renderTrend(stats.scanTrend, 
                  ((timeStats.today.scans - timeStats.yesterday.scans) / Math.max(timeStats.yesterday.scans, 1) * 100).toFixed(0)
                )}
              </div>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        {/* Products Detected */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Products Detected</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalProducts}</p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.uniqueProducts} unique SKUs
              </p>
            </div>
            <Package className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        {/* Compliance Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.complianceRate}%</p>
              <div className="mt-2">
                {renderTrend(stats.complianceTrend,
                  (timeStats.today.compliance - timeStats.yesterday.compliance).toFixed(0)
                )}
              </div>
            </div>
            <CheckCircle className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        {/* Stock Issues */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Stock Issues</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.outOfStockCount + stats.lowStockCount}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.outOfStockCount} OOS, {stats.lowStockCount} Low
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>
      
      {/* Time-based Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Over Time</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(timeStats).map(([period, data]) => (
            <div key={period} className="text-center">
              <p className="text-sm text-gray-600 capitalize">{period.replace(/([A-Z])/g, ' $1').trim()}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{data.scans}</p>
              <p className="text-xs text-gray-500">scans</p>
              <p className="text-sm text-gray-700 mt-2">{data.products}</p>
              <p className="text-xs text-gray-500">products</p>
              <div className="mt-2">
                <span className={`text-sm font-medium ${
                  data.compliance >= 80 ? 'text-green-600' : 
                  data.compliance >= 60 ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {data.compliance}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Scans</h3>
        <div className="space-y-3">
          {recentScans.length > 0 ? (
            recentScans.map((scan) => (
              <div key={scan.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Scan #{scan.id.slice(-6)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {scan.detections?.length || 0} products • {formatTimeAgo(scan.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    scan.stats?.complianceRate >= 80 
                      ? 'bg-green-100 text-green-800'
                      : scan.stats?.complianceRate >= 60
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {scan.stats?.complianceRate?.toFixed(0) || 0}% compliant
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No recent scans</p>
          )}
        </div>
      </div>
      
      {/* Additional Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
            <div>
              <p className="text-2xl font-bold text-green-900">{stats.perfectShelfCount}</p>
              <p className="text-sm text-green-700">Perfect Shelves</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-blue-600 mr-2" />
            <div>
              <p className="text-2xl font-bold text-blue-900">{stats.avgProductsPerScan}</p>
              <p className="text-sm text-blue-700">Avg Products/Scan</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4">
          <div className="flex items-center">
            <ShoppingCart className="h-6 w-6 text-yellow-600 mr-2" />
            <div>
              <p className="text-2xl font-bold text-yellow-900">{stats.overstockCount}</p>
              <p className="text-sm text-yellow-700">Overstock Items</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-6 w-6 text-purple-600 mr-2" />
            <div>
              <p className="text-2xl font-bold text-purple-900">{timeStats.today.scans}</p>
              <p className="text-sm text-purple-700">Scans Today</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
