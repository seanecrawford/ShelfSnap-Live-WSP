
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Plus, Calendar, Users, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import MeetingCard from '@/components/boardroom/MeetingCard';
import CreateMeetingDialog from '@/components/boardroom/CreateMeetingDialog';
import { supabase } from '@/lib/customSupabaseClient';

const BoardroomPage = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('board_meetings').select('*').order('date', { ascending: true });
    if (error) {
      toast({ title: "Error fetching meetings", description: error.message, variant: "destructive" });
    } else {
      setMeetings(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleCreateMeeting = async (meetingData) => {
    const { data, error } = await supabase.from('board_meetings').insert([meetingData]).select();
    if (error) {
      toast({ title: "Error scheduling meeting", description: error.message, variant: "destructive" });
    } else {
      setMeetings(prev => [...prev, data[0]]);
      toast({
        title: "Meeting scheduled! 📅",
        description: `${meetingData.title} has been added to the calendar`,
      });
    }
  };

  const stats = [
    { label: 'Upcoming Meetings', value: meetings.filter(m => m.status === 'upcoming').length, icon: Calendar, color: 'text-green-400' },
    { label: 'Total Attendees', value: meetings.reduce((acc, m) => acc + (m.attendees?.length || 0), 0), icon: Users, color: 'text-blue-400' },
    { label: 'Action Items', value: 8, icon: FileText, color: 'text-yellow-400' },
    { label: 'AI Summaries', value: 12, icon: Sparkles, color: 'text-purple-400' },
  ];

  return (
    <>
      <Helmet>
        <title>Boardroom AI - Sprig Work Suite Pro</title>
        <meta name="description" content="AI-powered board meeting management with automated summaries and action tracking" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Boardroom AI</h1>
            <p className="text-slate-400 mt-1">AI-powered meeting management and collaboration</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-6 border border-purple-500/20">
          <div className="flex items-start gap-4">
            <Sparkles className="w-6 h-6 text-purple-400 mt-1" />
            <div>
              <h3 className="font-semibold text-white mb-2">AI Meeting Assistant Active</h3>
              <p className="text-slate-300 text-sm">
                Your AI agent will automatically transcribe discussions, generate summaries, extract action items, and follow up on decisions after each meeting.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Upcoming Meetings</h2>
          {loading ? (
            <div className="text-center p-8 text-slate-400">Loading meetings...</div>
          ) : meetings.length === 0 ? (
            <div className="bg-slate-800/30 rounded-xl p-12 text-center border border-slate-700/50">
              <p className="text-slate-400">No meetings scheduled. Create your first meeting!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {meetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
        </div>

        <CreateMeetingDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreateMeeting={handleCreateMeeting}
        />
      </div>
    </>
  );
};

export default BoardroomPage;
