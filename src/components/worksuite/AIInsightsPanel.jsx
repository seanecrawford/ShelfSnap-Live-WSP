
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';

const AIInsightsPanel = ({ projects }) => {
  const insights = [
    {
      icon: TrendingUp,
      color: 'text-green-400',
      title: 'Productivity Up',
      description: 'Team velocity increased 15% this week'
    },
    {
      icon: AlertTriangle,
      color: 'text-yellow-400',
      title: 'Attention Needed',
      description: '2 projects approaching deadline'
    },
    {
      icon: Lightbulb,
      color: 'text-blue-400',
      title: 'AI Suggestion',
      description: 'Consider redistributing tasks for better balance'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h2 className="text-xl font-semibold text-white">AI Insights</h2>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50"
          >
            <div className="flex items-start gap-3">
              <insight.icon className={`w-5 h-5 ${insight.color} mt-0.5`} />
              <div>
                <h3 className="font-medium text-white text-sm">{insight.title}</h3>
                <p className="text-slate-400 text-xs mt-1">{insight.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/20">
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-purple-400">AI Agent Active:</span> Monitoring project health and suggesting optimizations in real-time.
        </p>
      </div>
    </div>
  );
};

export default AIInsightsPanel;
