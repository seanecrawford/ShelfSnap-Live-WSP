
import React from 'react';
import { Menu, Bell, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = ({ currentUser, onSignOut, onMenuClick }) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-slate-400 hover:text-white"
          aria-label="Open sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="lg:hidden flex-1"></div> {/* Spacer for mobile */}

        <div className="flex items-center gap-4 ml-auto">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <Bell className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <Avatar>
                  <AvatarFallback className="bg-blue-500 text-white">
                    {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-white">{currentUser?.name}</p>
                  <p className="text-xs text-slate-400">{currentUser?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="text-red-400 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
