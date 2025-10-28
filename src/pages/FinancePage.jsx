
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { DollarSign, TrendingUp, TrendingDown, Percent, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatCurrency = (value) => {
  if (typeof value !== 'number') return '$0';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const FinancePage = () => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('finance_metrics')
        .select('*')
        .order('period', { ascending: false });

      if (error) {
        toast({ title: "Error fetching finance data", description: error.message, variant: "destructive" });
      } else {
        setMetrics(data || []);
      }
      setLoading(false);
    };
    fetchMetrics();
  }, [toast]);
  
  const totalRevenue = metrics.reduce((sum, item) => sum + item.revenue, 0);
  const totalExpenses = metrics.reduce((sum, item) => sum + item.opex, 0); // Simplified for demo
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  
  const summaryStats = [
    { title: "Total Revenue", value: formatCurrency(totalRevenue), icon: DollarSign },
    { title: "Total Expenses", value: formatCurrency(totalExpenses), icon: TrendingDown },
    { title: "Net Profit", value: formatCurrency(netProfit), icon: TrendingUp },
    { title: "Profit Margin", value: `${profitMargin.toFixed(2)}%`, icon: Percent },
    { title: "Avg. Project Budget", value: formatCurrency(5140705), icon: Target },
  ];

  const profitabilityRatios = [
    { label: "Net Profit Margin", value: "60.37%" },
    { label: "Gross Profit Margin", value: "86.91%" },
    { label: "Operating Margin", value: "60.37%" },
  ];
  
  return (
    <>
      <Helmet>
        <title>Finance Hub - Sprig Work Suite Pro</title>
        <meta name="description" content="Centralized dashboard for financial insights and analysis." />
      </Helmet>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Finance Hub</h1>
          <p className="text-slate-400 mt-1">Centralized dashboard for financial insights and analysis.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {summaryStats.map((stat, i) => (
            <motion.div key={i} initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{delay: i * 0.1}}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Revenue vs. Expenses Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <p>Loading data...</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium text-white">{new Date(row.period).toLocaleString('default', { month: 'short' })} {new Date(row.period).getFullYear()}</TableCell>
                        <TableCell className="text-right text-green-400">{formatCurrency(row.revenue)}</TableCell>
                        <TableCell className="text-right text-red-400">{formatCurrency(row.opex)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Profitability Ratios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profitabilityRatios.map(ratio => (
                  <div key={ratio.label} className="flex justify-between items-center">
                    <span className="text-slate-300">{ratio.label}</span>
                    <span className="font-bold text-lg text-white">{ratio.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </>
  );
};

export default FinancePage;
