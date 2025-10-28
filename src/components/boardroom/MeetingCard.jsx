
import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const MeetingCard = ({ meeting }) => {
  const { toast } = useToast();

  const handleJoin = () => {
    toast({
      title: "🚧 Feature coming soon!",
      description: "Video conferencing integration will be available in the next update",
    });
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-green-500/50 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{meeting.title}</h3>
          <p className="text-slate-400 text-sm mt-1">{meeting.agenda}</p>
        </div>
        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
          {meeting.status}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{meeting.date ? new Date(meeting.date).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{meeting.time || 'N/A'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Users className="w-4 h-4" />
          <span>{meeting.attendees?.length || 0} attendees</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleJoin} className="flex-1 bg-green-600 hover:bg-green-700">
            Join Meeting
          </Button>
          <Button variant="outline" className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            Agenda
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default MeetingCard;
