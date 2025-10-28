
import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Briefcase, CheckSquare, DollarSign, Users, Package, BarChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const modules = [
  { title: "Project Management", icon: Briefcase, color: "text-blue-400", bg: "bg-blue-500/10", path: "/project-management", description: "Plan, track, and manage team projects." },
  { title: "Task Board", icon: CheckSquare, color: "text-yellow-400", bg: "bg-yellow-500/10", path: "/task-board", description: "Visualize and organize your workflow." },
  { title: "Finance Hub", icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10", path: "/finance-hub", description: "Analyze your financial performance." },
  { title: "Boardroom AI", icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10", path: "/boardroom", description: "AI-powered meeting summaries." },
  { title: "ShelfSnap", icon: Package, color: "text-purple-400", bg: "bg-purple-500/10", path: "/shelfsnap", description: "Analyze retail shelf compliance." },
  { title: "Analytics", icon: BarChart, color: "text-pink-400", bg: "bg-pink-500/10", path: "/dashboard", description: "Get insights from your data." },
];

const DashboardPage = () => {
  return (
    <>
      <Helmet>
        <title>Dashboard - Sprig Work Suite Pro</title>
        <meta name="description" content="Welcome to your centralized dashboard for Sprig Work Suite Pro." />
      </Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back! Here's your suite at a glance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => (
            <motion.div
              key={module.title}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Link to={module.path}>
                <Card className="h-full hover:border-slate-600 transition-colors group">
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                    <div className={`p-3 rounded-lg ${module.bg}`}>
                      <module.icon className={`w-6 h-6 ${module.color}`} />
                    </div>
                    <CardTitle className="text-xl text-white group-hover:text-blue-400 transition-colors">{module.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400">{module.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
