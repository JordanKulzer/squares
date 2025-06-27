create table "public"."players" (
    "id" uuid not null default gen_random_uuid(),
    "square_id" uuid not null default gen_random_uuid(),
    "user_id" uuid default gen_random_uuid(),
    "username" text,
    "color" text,
    "icon_url" text,
    "joined_at" timestamp with time zone
);


alter table "public"."players" enable row level security;

create table "public"."selections" (
    "id" uuid not null default gen_random_uuid(),
    "square_id" uuid not null default gen_random_uuid(),
    "player_id" uuid default gen_random_uuid(),
    "x" integer,
    "y" integer,
    "selected_at" timestamp with time zone
);


alter table "public"."selections" enable row level security;

create table "public"."squares" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "created_by" uuid default gen_random_uuid(),
    "team1" text,
    "team2" text,
    "x_axis" text[],
    "y_axis" text[],
    "event_id" text,
    "axis_hidden" boolean,
    "username" text,
    "players" jsonb,
    "deadline" timestamp with time zone,
    "selections" jsonb,
    "max_selections" integer
);


alter table "public"."squares" enable row level security;

CREATE UNIQUE INDEX players_pkey ON public.players USING btree (id);

CREATE UNIQUE INDEX selections_pkey ON public.selections USING btree (id);

CREATE UNIQUE INDEX squares_pkey ON public.squares USING btree (id);

alter table "public"."players" add constraint "players_pkey" PRIMARY KEY using index "players_pkey";

alter table "public"."selections" add constraint "selections_pkey" PRIMARY KEY using index "selections_pkey";

alter table "public"."squares" add constraint "squares_pkey" PRIMARY KEY using index "squares_pkey";

grant delete on table "public"."players" to "anon";

grant insert on table "public"."players" to "anon";

grant references on table "public"."players" to "anon";

grant select on table "public"."players" to "anon";

grant trigger on table "public"."players" to "anon";

grant truncate on table "public"."players" to "anon";

grant update on table "public"."players" to "anon";

grant delete on table "public"."players" to "authenticated";

grant insert on table "public"."players" to "authenticated";

grant references on table "public"."players" to "authenticated";

grant select on table "public"."players" to "authenticated";

grant trigger on table "public"."players" to "authenticated";

grant truncate on table "public"."players" to "authenticated";

grant update on table "public"."players" to "authenticated";

grant delete on table "public"."players" to "service_role";

grant insert on table "public"."players" to "service_role";

grant references on table "public"."players" to "service_role";

grant select on table "public"."players" to "service_role";

grant trigger on table "public"."players" to "service_role";

grant truncate on table "public"."players" to "service_role";

grant update on table "public"."players" to "service_role";

grant delete on table "public"."selections" to "anon";

grant insert on table "public"."selections" to "anon";

grant references on table "public"."selections" to "anon";

grant select on table "public"."selections" to "anon";

grant trigger on table "public"."selections" to "anon";

grant truncate on table "public"."selections" to "anon";

grant update on table "public"."selections" to "anon";

grant delete on table "public"."selections" to "authenticated";

grant insert on table "public"."selections" to "authenticated";

grant references on table "public"."selections" to "authenticated";

grant select on table "public"."selections" to "authenticated";

grant trigger on table "public"."selections" to "authenticated";

grant truncate on table "public"."selections" to "authenticated";

grant update on table "public"."selections" to "authenticated";

grant delete on table "public"."selections" to "service_role";

grant insert on table "public"."selections" to "service_role";

grant references on table "public"."selections" to "service_role";

grant select on table "public"."selections" to "service_role";

grant trigger on table "public"."selections" to "service_role";

grant truncate on table "public"."selections" to "service_role";

grant update on table "public"."selections" to "service_role";

grant delete on table "public"."squares" to "anon";

grant insert on table "public"."squares" to "anon";

grant references on table "public"."squares" to "anon";

grant select on table "public"."squares" to "anon";

grant trigger on table "public"."squares" to "anon";

grant truncate on table "public"."squares" to "anon";

grant update on table "public"."squares" to "anon";

grant delete on table "public"."squares" to "authenticated";

grant insert on table "public"."squares" to "authenticated";

grant references on table "public"."squares" to "authenticated";

grant select on table "public"."squares" to "authenticated";

grant trigger on table "public"."squares" to "authenticated";

grant truncate on table "public"."squares" to "authenticated";

grant update on table "public"."squares" to "authenticated";

grant delete on table "public"."squares" to "service_role";

grant insert on table "public"."squares" to "service_role";

grant references on table "public"."squares" to "service_role";

grant select on table "public"."squares" to "service_role";

grant trigger on table "public"."squares" to "service_role";

grant truncate on table "public"."squares" to "service_role";

grant update on table "public"."squares" to "service_role";

create policy "Users can create their own player entry"
on "public"."players"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "Users can delete their own player entry"
on "public"."players"
as permissive
for delete
to public
using ((user_id = auth.uid()));


create policy "Users can read their own player entry"
on "public"."players"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "Users can update their own player entry"
on "public"."players"
as permissive
for update
to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


create policy "Users can delete their own selections"
on "public"."selections"
as permissive
for delete
to public
using ((player_id = auth.uid()));


create policy "Users can insert their own selections"
on "public"."selections"
as permissive
for insert
to public
with check ((player_id = auth.uid()));


create policy "Users can read their own selections"
on "public"."selections"
as permissive
for select
to public
using ((player_id = auth.uid()));


create policy "Users can create squares for themselves"
on "public"."squares"
as permissive
for insert
to public
with check ((created_by = auth.uid()));


create policy "Users can delete their own squares"
on "public"."squares"
as permissive
for delete
to public
using ((created_by = auth.uid()));


create policy "Users can read their own squares"
on "public"."squares"
as permissive
for select
to public
using ((created_by = auth.uid()));


create policy "Users can update their own squares"
on "public"."squares"
as permissive
for update
to public
using ((created_by = auth.uid()))
with check ((created_by = auth.uid()));



