// SQL queries for nudge candidate selection

/**
 * Select members who are inactive for a specified number of days
 */
export const selectInactiveCandidates = `
  with last_seen as (
    select 
      m.id as member_id, 
      m.hub_id,
      coalesce(
        m.last_active_at, 
        (select max(a.created_at) from activity_logs a where a.member_id = m.id)
      ) as seen
    from members m
    where m.hub_id = $1
  )
  select member_id
  from last_seen
  where seen is null or seen < now() - ($2 || ' days')::interval
`

/**
 * Select new members who joined within a specified number of hours
 */
export const selectNewMembers = `
  select id as member_id
  from members
  where hub_id = $1
    and joined_at >= now() - ($2 || ' hours')::interval
    and joined_at < now() - interval '1 hour'
  order by joined_at desc
`

/**
 * Select members who have low activity (no events in specified days)
 */
export const selectLowActivityMembers = `
  with recent_events as (
    select distinct member_id
    from activity_logs
    where hub_id = $1
      and created_at >= now() - ($2 || ' days')::interval
  )
  select m.id as member_id
  from members m
  where m.hub_id = $1
    and not exists (
      select 1 from recent_events re where re.member_id = m.id
    )
`

/**
 * Select members who viewed a bounty but didn't complete it
 * (requires bounty_views tracking table - placeholder for now)
 */
export const selectViewedBountyNotCompleted = `
  select m.id as member_id
  from members m
  where m.hub_id = $1
    -- TODO: Implement when bounty_views table exists
    -- and exists (select 1 from bounty_views where member_id = m.id)
  limit 0
`

/**
 * Select members near a bounty deadline
 */
export const selectNearBountyDeadline = `
  select distinct m.id as member_id
  from members m
  cross join lateral (
    select id, ends_at
    from bounties
    where hub_id = $1
      and status = 'active'
      and ends_at is not null
      and ends_at between now() and now() + ($2 || ' hours')::interval
  ) b
  where not exists (
    select 1
    from bounty_events be
    where be.bounty_id = b.id
      and be.member_id = m.id
      and be.status = 'completed'
  )
`

