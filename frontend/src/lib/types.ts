export type WebDemoInitialState = {
  connection: boolean;
  mood?: unknown;
  emotional_shift?: unknown;
  context_usage_pct?: unknown;
  trust_level?: unknown;
  thoughts?: unknown;
};

export type WebDemoLoginResponse = {
  access_token: string;
  account_id: string | number;
  initial_state: WebDemoInitialState;
};

export type WebDemoResolveNeedsRegistration = {
  status: "needs_registration";
  message: string;
  required_fields: string[];
  gender_options?: string[];
};

export type WebDemoResolveOk = {
  status: "ok";
  access_token: string;
  account_id: string | number;
  initial_state: WebDemoInitialState;
};

export type WebDemoResolveResponse = WebDemoResolveNeedsRegistration | WebDemoResolveOk;

export type AssistantState = {
  state: string;
  timestamp?: string | null;
};

export type Usage = {
  account_id: string;
  model_name: string;
  provider: string;
  input_tokens_used: number;
  output_tokens_used: number;
  input_token_price: number;
  output_token_price: number;
  account_balance: number;
};

export type UpdateEmojiResponse = {
  success: boolean;
  message: string;
  message_id?: number;
  emoji?: string | null;
};

export type ChatHistoryMessage = {
  id: number;
  text: string;
  is_user: boolean;
  timestamp?: string | number | null;
  emoji?: string | null;
  image_count?: number;
  vision_context?: string | null;
};

export type ChatHistoryResponse = {
  messages: ChatHistoryMessage[];
  has_more: boolean;
  oldest_id: number | null;
  newest_id: number | null;
};

export type SearchResult = {
  messages: ChatHistoryMessage[];
  matched_message_id: number;
  total_matches: number;
  current_match_index: number;
  has_next: boolean;
  has_prev: boolean;
};


