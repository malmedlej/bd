
/*
# BD Pulse – Demo Users and Sample Data (revised)

Creates three demo users and sample BD data.
Password for all accounts: BDPulse2025!
*/

DO $$
DECLARE
  v_manager_id   uuid;
  v_employee_id  uuid;
  v_director_id  uuid;
  v_kpi1_id uuid := gen_random_uuid();
  v_kpi2_id uuid := gen_random_uuid();
  v_kpi3_id uuid := gen_random_uuid();
  v_kpi4_id uuid := gen_random_uuid();
  v_kpi5_id uuid := gen_random_uuid();
  v_kpi6_id uuid := gen_random_uuid();
BEGIN

  -- Create auth users (skip if email already exists)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'medlej@bahri-bd.demo') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'medlej@bahri-bd.demo',
      extensions.crypt('BDPulse2025!', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Medlej Almedlej"}',
      now(), now(), '', '', '', ''
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'reem@bahri-bd.demo') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'reem@bahri-bd.demo',
      extensions.crypt('BDPulse2025!', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Reem Alalwan"}',
      now(), now(), '', '', '', ''
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'director@bahri-bd.demo') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'director@bahri-bd.demo',
      extensions.crypt('BDPulse2025!', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}', '{"full_name":"BD Director"}',
      now(), now(), '', '', '', ''
    );
  END IF;

  -- Get user IDs
  SELECT id INTO v_manager_id  FROM auth.users WHERE email = 'medlej@bahri-bd.demo' LIMIT 1;
  SELECT id INTO v_employee_id FROM auth.users WHERE email = 'reem@bahri-bd.demo' LIMIT 1;
  SELECT id INTO v_director_id FROM auth.users WHERE email = 'director@bahri-bd.demo' LIMIT 1;

  -- Profiles
  INSERT INTO profiles (id, full_name, email, role, department, is_active)
  VALUES
    (v_manager_id,  'Medlej Almedlej', 'medlej@bahri-bd.demo',   'manager',  'Business Development', true),
    (v_employee_id, 'Reem Alalwan',    'reem@bahri-bd.demo',     'employee', 'Business Development', true),
    (v_director_id, 'BD Director',     'director@bahri-bd.demo', 'director', 'Executive',            true)
  ON CONFLICT (id) DO NOTHING;

  -- KPIs
  INSERT INTO kpis (id, kpi_name, objective, weight, formula_type, target_value, display_order, color, is_sample, created_by, owner_id)
  VALUES
    (v_kpi1_id, 'Solution Implementation',        'Execute logistics solution projects for key clients on time and within scope', 20, 'action_completion', 100, 1, '#0d9488', true, v_manager_id, v_employee_id),
    (v_kpi2_id, 'Automotive Vertical Development', 'Grow automotive sector client base and revenue pipeline',                    20, 'action_completion', 100, 2, '#3b82f6', true, v_manager_id, v_employee_id),
    (v_kpi3_id, 'Industrial Vertical Development', 'Develop industrial sector opportunities and qualified leads',                 15, 'action_completion', 100, 3, '#8b5cf6', true, v_manager_id, v_employee_id),
    (v_kpi4_id, 'Share of Wallet Growth',          'Increase year-over-year revenue from existing clients',                      20, 'share_of_wallet',   100, 4, '#f59e0b', true, v_manager_id, v_employee_id),
    (v_kpi5_id, 'CRM Hygiene',                     'Maintain accurate CargoWise CRM records for all active opportunities',       10, 'action_completion', 100, 5, '#ef4444', true, v_manager_id, v_employee_id),
    (v_kpi6_id, 'Weekly Action Discipline',        'Consistent weekly updates, check-ins, and task completion rate',             15, 'action_completion', 100, 6, '#10b981', true, v_manager_id, v_employee_id)
  ON CONFLICT (id) DO NOTHING;

  -- Weekly Actions
  INSERT INTO weekly_actions (
    task_title, description, owner_id, created_by, linked_kpi_id,
    client_name, category, priority, status, progress,
    start_date, due_date, employee_update, next_action,
    risk_issue, need_manager_support, last_updated, is_sample
  ) VALUES
    (
      'Wallan Group RFQ Follow-up',
      'Follow up on submitted RFQ for warehouse and distribution services. Await client decision.',
      v_employee_id, v_manager_id, v_kpi1_id,
      'Wallan Group', 'Proposal', 'High', 'In Progress', 25,
      CURRENT_DATE - 7, CURRENT_DATE + 3,
      'RFQ submitted last week. Awaiting technical review from client side.',
      'Schedule follow-up call with procurement team.',
      NULL, false, now() - interval '2 days', true
    ),
    (
      'NEO Space Group Client Follow-up',
      'Follow up on meeting held in Q1. Explore opportunity for specialized cargo handling.',
      v_employee_id, v_manager_id, v_kpi2_id,
      'NEO Space Group', 'Client Management', 'High', 'Completed', 100,
      CURRENT_DATE - 14, CURRENT_DATE - 2,
      'Meeting completed. Client expressed interest in automotive parts handling. Next steps agreed.',
      NULL, NULL, false, now() - interval '1 day', true
    ),
    (
      'B-Train Solution Deck Update',
      'Update the B-Train logistics solution presentation with latest case studies and pricing.',
      v_employee_id, v_manager_id, v_kpi1_id,
      NULL, 'Proposal', 'Critical', 'In Progress', 50,
      CURRENT_DATE - 5, CURRENT_DATE + 1,
      'Deck updated with 3 new case studies. Pricing section pending finance approval.',
      'Get pricing sign-off from finance team.',
      NULL, true, now() - interval '1 day', true
    ),
    (
      'MUSAHAMA Registration Completion',
      'Complete supplier and BD partner registration on MUSAHAMA government platform.',
      v_employee_id, v_manager_id, v_kpi5_id,
      'MUSAHAMA', 'Admin', 'High', 'Blocked', 40,
      CURRENT_DATE - 10, CURRENT_DATE - 1,
      'Registration form filled but submission blocked - missing CR attestation from legal.',
      'Escalate to legal team for urgent CR attestation.',
      'Missing CR attestation from legal department. Waiting for internal action.', true,
      now() - interval '3 days', true
    ),
    (
      'Automotive Opportunity Pipeline Update',
      'Update CargoWise with all automotive sector opportunities from Q2 prospecting.',
      v_employee_id, v_manager_id, v_kpi2_id,
      NULL, 'CRM / System', 'Medium', 'Not Started', 0,
      CURRENT_DATE, CURRENT_DATE + 5,
      NULL, 'Start CW update for automotive leads identified in April.',
      NULL, false, now(), true
    ),
    (
      'IdentiFlight Shipment Follow-up',
      'Coordinate customs clearance and delivery for IdentiFlight technical equipment shipment.',
      v_employee_id, v_manager_id, v_kpi1_id,
      'IdentiFlight', 'Operations', 'Critical', 'Delayed', 40,
      CURRENT_DATE - 8, CURRENT_DATE - 2,
      'Shipment delayed at customs. Port congestion causing 3-day delay.',
      'Contact customs broker for expedited clearance.',
      'Port congestion. Customs clearance delayed by 3 days. Client notified.', false,
      now() - interval '1 day', true
    ),
    (
      'CargoWise CRM Data Validation',
      'Review and validate all existing client records in CargoWise for accuracy.',
      v_employee_id, v_manager_id, v_kpi5_id,
      NULL, 'CRM / System', 'Low', 'Not Started', 0,
      CURRENT_DATE + 2, CURRENT_DATE + 10,
      NULL, 'Start data audit next week.',
      NULL, false, now(), true
    );

  -- Add manager feedback to B-Train action
  UPDATE weekly_actions
  SET manager_feedback = 'Please prioritize getting the pricing sign-off before end of this week. This is blocking the client proposal.',
      manager_feedback_at = now() - interval '12 hours',
      manager_feedback_by = v_manager_id
  WHERE task_title = 'B-Train Solution Deck Update' AND is_sample = true;

  -- Milestones
  INSERT INTO milestones (kpi_id, milestone_name, description, owner_id, start_date, due_date, completion, status, is_sample)
  VALUES
    (v_kpi2_id, 'First Automotive Client Signed',  'Sign first automotive sector logistics contract',         v_employee_id, CURRENT_DATE - 30, CURRENT_DATE + 60, 40, 'In Progress', true),
    (v_kpi1_id, 'B-Train Pilot Deployment',        'Complete B-Train pilot deployment for initial client',    v_employee_id, CURRENT_DATE - 10, CURRENT_DATE + 14, 50, 'In Progress', true),
    (v_kpi4_id, 'Q2 Wallet Review Complete',       'Complete share of wallet review for top 10 clients',     v_employee_id, CURRENT_DATE - 20, CURRENT_DATE + 7,  70, 'In Progress', true),
    (v_kpi3_id, 'Industrial Sector Whitepaper',    'Publish BD whitepaper for industrial vertical',          v_employee_id, CURRENT_DATE,      CURRENT_DATE + 45,  0, 'Not Started', true),
    (v_kpi5_id, 'CRM Full Audit',                  'Complete full CargoWise CRM data audit and cleanup',     v_employee_id, CURRENT_DATE + 5,  CURRENT_DATE + 30,  0, 'Not Started', true);

  -- Share of Wallet
  INSERT INTO share_of_wallet (client_name, spend_2025, spend_2026_ytd, opportunity_identified, cross_sell_area, next_action, owner_id, status, is_sample)
  VALUES
    ('Wallan Group',   1200000, 1450000, 'Expand to warehousing services',       'Warehousing',     'Present warehousing proposal',  v_employee_id, 'Growing',     true),
    ('NEO Space Group',  450000,  490000, 'Automotive parts specialized handling','Automotive',      'Close Q2 proposal',            v_employee_id, 'Growing',     true),
    ('IdentiFlight',     280000,  190000, NULL,                                   NULL,              'Resolve shipment delays',      v_employee_id, 'At Risk',     true),
    ('MUSAHAMA',          75000,   80000, 'Government tender opportunities',      'Tender Support',  'Complete registration',        v_employee_id, 'Opportunity', true),
    ('Saudi Aramco JV', 3200000, 3200000, 'Cross-sell air freight services',      'Air Freight',     'Annual review meeting Q3',     v_employee_id, 'Flat',        true),
    ('Riyadh Steel',     620000,  510000, NULL,                                   NULL,              'Retention call with ops team', v_employee_id, 'Declining',   true);

  -- Alerts for Reem
  INSERT INTO alerts (user_id, alert_type, title, message, is_read)
  VALUES
    (v_employee_id, 'overdue',   'Action Overdue',            'MUSAHAMA Registration is past its due date.',                           false),
    (v_employee_id, 'feedback',  'Manager Feedback Received', 'Medlej added feedback on B-Train Solution Deck Update.',               false),
    (v_employee_id, 'blocked',   'Action Needs Attention',    'IdentiFlight Shipment Follow-up is Delayed. Update required.',          true),
    (v_manager_id,  'support',   'Support Requested',         'Reem marked B-Train Solution Deck Update as needing manager support.',  false),
    (v_manager_id,  'overdue',   'Team Action Overdue',       'MUSAHAMA Registration (Reem) is overdue.',                             false);

END $$;
