import sys
sys.path.insert(0, '/home/agent/Projects/SWE-Squad-DEV')
import os
from dotenv import load_dotenv
load_dotenv('/home/agent/Projects/SWE-Squad-DEV/.env')
from src.swe_team.supabase_store import SupabaseTicketStore
from src.swe_team.code_reviewer import CodeReviewerAgent

store = SupabaseTicketStore(supabase_url=os.environ['SUPABASE_URL'], supabase_key=os.environ['SUPABASE_ANON_KEY'], team_id=os.environ.get('SWE_TEAM_ID', 'default'))
ticket = store.get('37ac3f76d66c')
if ticket:
    repo_root = ticket.metadata.get('repo_root', '/home/agent/Projects/SWE-Squad-Website')
    code_reviewer = CodeReviewerAgent(model='sonnet')
    approved, feedback = code_reviewer.review(ticket, store, repo_root=repo_root)
    print(f"Ticket {ticket.ticket_id}: approved={approved} feedback={feedback}")
else:
    print("Ticket not found")
