// Game Invites types for database-backed invite system

export interface GameInvite {
  id: string;
  grid_id: string;
  sender_id: string;
  recipient_id: string;
  session_title: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  responded_at: string | null;
}

export interface GameInviteWithSender extends GameInvite {
  sender_username: string | null;
  sender_email: string | null;
}
