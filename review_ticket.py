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
    # Update the ticket with the branch name
    metadata = ticket.metadata or {}
    metadata['branch'] = 'swe-fix/ticket-37ac3f76d66c'
    metadata['repo_root'] = '/home/agent/Projects/SWE-Squad-Website'
    
    # Use add() instead of update() as SupabaseTicketStore uses add() for upserts
    ticket.metadata = metadata
    ticket.branch = 'swe-fix/ticket-37ac3f76d66c'
    store.add(ticket)
    
    # Now run the code reviewer
    repo_root = '/home/agent/Projects/SWE-Squad-Website'
    code_reviewer = CodeReviewerAgent(model='sonnet')
    approved, feedback = code_reviewer.review(ticket, store, repo_root=repo_root)
    print(f"Ticket {ticket.ticket_id}: approved={approved} feedback={feedback}")
else:
    print("Ticket not found")
