
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Database, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const SettingsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [loading, setLoading] = useState(false);

  const currentUser = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
    email: user?.email,
    role: user?.user_metadata?.role || 'Member',
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    });

    if (error) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Profile updated! ✅",
        description: "Your preferences have been updated successfully",
      });
    }
    setLoading(false);
  };

  const sections = [
    {
      icon: User,
      title: 'Profile Settings',
      description: 'Manage your account information',
      color: 'text-blue-400'
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configure notification preferences',
      color: 'text-yellow-400'
    },
    {
      icon: Shield,
      title: 'Security',
      description: 'Password and authentication settings',
      color: 'text-green-400'
    },
    {
      icon: Database,
      title: 'Data & Storage',
      description: 'Manage your data and integrations',
      color: 'text-purple-400'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Settings - Sprig Work Suite Pro</title>
        <meta name="description" content="Manage your Sprig Work Suite Pro settings and preferences" />
      </Helmet>

      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your account and preferences</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-xl font-semibold text-white mb-6">Profile Information</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-200">Full Name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={currentUser?.email}
                disabled
                className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-200">Role</Label>
              <Input
                id="role"
                defaultValue={currentUser?.role}
                disabled
                className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-60"
              />
            </div>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer"
            >
              <section.icon className={`w-8 h-8 ${section.color} mb-4`} />
              <h3 className="text-lg font-semibold text-white mb-2">{section.title}</h3>
              <p className="text-slate-400 text-sm">{section.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
