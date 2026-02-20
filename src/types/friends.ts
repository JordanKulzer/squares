// Types for the friends system with MySpace-style Top 4 rankings

export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendStatus;
  ranking: number | null; // 1-4 for Top 4, null if unranked
  created_at: string;
  accepted_at: string | null;
}

// Friend with user profile data joined from users table
export interface FriendWithProfile extends Friend {
  friend_username: string | null;
  friend_email: string | null;
  friend_push_token: string | null;
  friend_active_badge: string | null;
}

// Incoming friend request (where current user is the friend_id)
export interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending';
  created_at: string;
  // Requester's info
  requester_username: string | null;
  requester_email: string | null;
  requester_active_badge: string | null;
}

// User search result for adding friends
export interface UserSearchResult {
  id: string;
  username: string | null;
  email: string | null;
  active_badge: string | null;
  // Relationship status with current user
  friendship_status: FriendStatus | 'none' | 'incoming_request';
  friendship_id: string | null;
}

// For displaying Top 4 with empty slots
export interface Top4Slot {
  position: 1 | 2 | 3 | 4;
  friend: FriendWithProfile | null;
}

// For checking your ranking on a friend's list
export interface MyRankingInfo {
  friend_id: string;
  friend_username: string | null;
  my_ranking: number | null; // null if not in their Top 4
}
