"use strict";
/**
 * DEMO ONLY – safe to re-run; only affects DEMO_HUB_ID
 *
 * Seed demo data for the Overview page to make charts look alive.
 *
 * This script:
 * - Inserts ~40 demo members spread over the last 120 days
 * - Creates engagement activity (daily active users 2-20, some days zero) over the last 90 days
 * - Inserts messages (activity_logs with type="posted") to match engagement trend
 * - Inserts 5-15 bounty completion events over the last 60-90 days
 *
 * Usage: pnpm tsx scripts/seed-demo-overview.ts
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables from .env.local before importing modules
var dotenv_1 = require("dotenv");
var node_url_1 = require("node:url");
var node_path_1 = require("node:path");
var __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
var __dirname = (0, node_path_1.dirname)(__filename);
var envPath = (0, node_path_1.join)(__dirname, "..", ".env.local");
(0, dotenv_1.config)({ path: envPath });
function main() {
    return __awaiter(this, void 0, void 0, function () {
        // Helper: Generate a date in the past
        function daysAgo(days) {
            var date = new Date();
            date.setUTCDate(date.getUTCDate() - days);
            return date;
        }
        // Helper: Random date within a range (days ago)
        function randomDateInRange(minDaysAgo, maxDaysAgo) {
            var daysAgo = minDaysAgo + Math.random() * (maxDaysAgo - minDaysAgo);
            var date = new Date();
            date.setUTCDate(date.getUTCDate() - daysAgo);
            date.setUTCHours(Math.floor(Math.random() * 24));
            date.setUTCMinutes(Math.floor(Math.random() * 60));
            date.setUTCSeconds(Math.floor(Math.random() * 60));
            return date;
        }
        // Helper: Get day key (YYYY-MM-DD) for a date
        function dayKey(date) {
            return date.toISOString().slice(0, 10);
        }
        var createServiceClient, crypto, DEMO_HUB_ID, db, _a, deleteActivityError, deletedActivityCount, _b, deleteBountyEventsError, deletedBountyEventsCount, _c, deleteMembersError, deletedMembersCount, memberCount, members, memberIds, i, memberId, batchSize, i, batch, insertError, activityLogs, today, dayOffset, dayDate, isWeekend, shouldSkip, dau, activeMemberIds, _i, activeMemberIds_1, memberId, messageCount, msg, messageTime, i, batch, insertError, existingBounties, bountyIds, demoBounties, _d, demoBounties_1, bounty, bountyId, insertError, bountyCompletionCount, completionCount, bountyEvents, i, memberId, bountyId, completedAt, i, batch, insertError;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require("@/server/db"); })];
                case 1:
                    createServiceClient = (_e.sent()).createServiceClient;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("crypto"); })];
                case 2:
                    crypto = _e.sent();
                    DEMO_HUB_ID = process.env.DEMO_HUB_ID;
                    if (!DEMO_HUB_ID) {
                        throw new Error("DEMO_HUB_ID environment variable is required. Set it in .env.local");
                    }
                    console.log("\uD83C\uDF31 Seeding demo data for hub: ".concat(DEMO_HUB_ID));
                    console.log("⚠️  DEMO ONLY – This will only affect data for DEMO_HUB_ID\n");
                    db = createServiceClient();
                    if (!db) {
                        throw new Error("Missing Supabase client. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE are set.");
                    }
                    // Step 1: Delete existing demo data (idempotent)
                    console.log("🧹 Cleaning up existing demo data for DEMO_HUB_ID...");
                    return [4 /*yield*/, db
                            .from("activity_logs")
                            .delete({ count: "exact" })
                            .eq("hub_id", DEMO_HUB_ID)];
                case 3:
                    _a = _e.sent(), deleteActivityError = _a.error, deletedActivityCount = _a.count;
                    if (deleteActivityError) {
                        throw new Error("Failed to delete activity_logs: ".concat(deleteActivityError.message));
                    }
                    console.log("   Deleted ".concat(deletedActivityCount || 0, " activity_logs"));
                    return [4 /*yield*/, db
                            .from("bounty_events")
                            .delete({ count: "exact" })
                            .eq("hub_id", DEMO_HUB_ID)];
                case 4:
                    _b = _e.sent(), deleteBountyEventsError = _b.error, deletedBountyEventsCount = _b.count;
                    if (deleteBountyEventsError) {
                        throw new Error("Failed to delete bounty_events: ".concat(deleteBountyEventsError.message));
                    }
                    console.log("   Deleted ".concat(deletedBountyEventsCount || 0, " bounty_events"));
                    return [4 /*yield*/, db
                            .from("members")
                            .delete({ count: "exact" })
                            .eq("hub_id", DEMO_HUB_ID)];
                case 5:
                    _c = _e.sent(), deleteMembersError = _c.error, deletedMembersCount = _c.count;
                    if (deleteMembersError) {
                        throw new Error("Failed to delete members: ".concat(deleteMembersError.message));
                    }
                    console.log("   Deleted ".concat(deletedMembersCount || 0, " members"));
                    // Step 2: Create ~40 demo members spread over the last 120 days
                    console.log("\n👥 Creating ~40 demo members (spread over last 120 days)...");
                    memberCount = 40;
                    members = [];
                    memberIds = [];
                    for (i = 1; i <= memberCount; i++) {
                        memberId = crypto.randomUUID();
                        memberIds.push(memberId);
                        members.push({
                            id: memberId,
                            hub_id: DEMO_HUB_ID,
                        });
                    }
                    batchSize = 50;
                    i = 0;
                    _e.label = 6;
                case 6:
                    if (!(i < members.length)) return [3 /*break*/, 9];
                    batch = members.slice(i, i + batchSize);
                    return [4 /*yield*/, db.from("members").insert(batch)];
                case 7:
                    insertError = (_e.sent()).error;
                    if (insertError) {
                        throw new Error("Failed to insert members: ".concat(insertError.message));
                    }
                    _e.label = 8;
                case 8:
                    i += batchSize;
                    return [3 /*break*/, 6];
                case 9:
                    console.log("   \u2705 Created ".concat(members.length, " members"));
                    // Step 3: Create engagement activity for the last 90 days
                    // Daily active users should range 2-20, with some days having zero
                    console.log("\n📊 Creating engagement activity (last 90 days, DAU: 2-20, some days zero)...");
                    activityLogs = [];
                    today = new Date();
                    today.setUTCHours(23, 59, 59, 999);
                    for (dayOffset = 0; dayOffset < 90; dayOffset++) {
                        dayDate = new Date(today);
                        dayDate.setUTCDate(dayDate.getUTCDate() - dayOffset);
                        dayDate.setUTCHours(0, 0, 0, 0);
                        isWeekend = dayDate.getUTCDay() === 0 || dayDate.getUTCDay() === 6;
                        shouldSkip = isWeekend && Math.random() < 0.3 || Math.random() < 0.15;
                        if (shouldSkip) {
                            continue; // Skip this day (zero activity)
                        }
                        dau = 2 + Math.floor(Math.random() * 19) // 2-20 inclusive
                        ;
                        activeMemberIds = new Set();
                        while (activeMemberIds.size < dau) {
                            activeMemberIds.add(memberIds[Math.floor(Math.random() * memberIds.length)]);
                        }
                        for (_i = 0, activeMemberIds_1 = activeMemberIds; _i < activeMemberIds_1.length; _i++) {
                            memberId = activeMemberIds_1[_i];
                            messageCount = 1 + Math.floor(Math.random() * 5);
                            for (msg = 0; msg < messageCount; msg++) {
                                messageTime = new Date(dayDate);
                                messageTime.setUTCHours(Math.floor(Math.random() * 24));
                                messageTime.setUTCMinutes(Math.floor(Math.random() * 60));
                                messageTime.setUTCSeconds(Math.floor(Math.random() * 60));
                                activityLogs.push({
                                    hub_id: DEMO_HUB_ID,
                                    member_id: memberId,
                                    type: "posted",
                                    created_at: messageTime.toISOString(),
                                });
                            }
                        }
                    }
                    i = 0;
                    _e.label = 10;
                case 10:
                    if (!(i < activityLogs.length)) return [3 /*break*/, 13];
                    batch = activityLogs.slice(i, i + batchSize);
                    return [4 /*yield*/, db.from("activity_logs").insert(batch)];
                case 11:
                    insertError = (_e.sent()).error;
                    if (insertError) {
                        throw new Error("Failed to insert activity_logs: ".concat(insertError.message));
                    }
                    _e.label = 12;
                case 12:
                    i += batchSize;
                    return [3 /*break*/, 10];
                case 13:
                    console.log("   \u2705 Created ".concat(activityLogs.length, " activity_logs (messages)"));
                    // Step 4: Create bounty completion events (5-15 over last 60-90 days)
                    console.log("\n🏆 Creating bounty completion events (5-15 over last 60-90 days)...");
                    return [4 /*yield*/, db
                            .from("bounties")
                            .select("id")
                            .eq("hub_id", DEMO_HUB_ID)];
                case 14:
                    existingBounties = (_e.sent()).data;
                    bountyIds = (existingBounties === null || existingBounties === void 0 ? void 0 : existingBounties.map(function (b) { return b.id; })) || [];
                    if (!(bountyIds.length === 0)) return [3 /*break*/, 18];
                    console.log("   ⚠️  No bounties found. Creating 3 demo bounties...");
                    demoBounties = [
                        { name: "Welcome Video", reward_type: "cash", amount: 5000 },
                        { name: "Community Guide", reward_type: "points", amount: 100 },
                        { name: "Social Media Templates", reward_type: "badge", badge_name: "Design Master", badge_icon: "🎨" },
                    ];
                    _d = 0, demoBounties_1 = demoBounties;
                    _e.label = 15;
                case 15:
                    if (!(_d < demoBounties_1.length)) return [3 /*break*/, 18];
                    bounty = demoBounties_1[_d];
                    bountyId = crypto.randomUUID();
                    return [4 /*yield*/, db.from("bounties").insert({
                            id: bountyId,
                            hub_id: DEMO_HUB_ID,
                            name: bounty.name,
                            reward_type: bounty.reward_type,
                            amount: bounty.amount || null,
                            badge_name: bounty.badge_name || null,
                            badge_icon: bounty.badge_icon || null,
                            status: "active",
                        })];
                case 16:
                    insertError = (_e.sent()).error;
                    if (insertError) {
                        console.error("   \u26A0\uFE0F  Failed to create demo bounty \"".concat(bounty.name, "\": ").concat(insertError.message));
                    }
                    else {
                        bountyIds.push(bountyId);
                    }
                    _e.label = 17;
                case 17:
                    _d++;
                    return [3 /*break*/, 15];
                case 18:
                    bountyCompletionCount = 0;
                    if (!(bountyIds.length === 0)) return [3 /*break*/, 19];
                    console.log("   ⚠️  No bounties available. Skipping bounty completion events.");
                    return [3 /*break*/, 24];
                case 19:
                    completionCount = 5 + Math.floor(Math.random() * 11) // 5-15 inclusive
                    ;
                    bountyCompletionCount = completionCount;
                    bountyEvents = [];
                    for (i = 0; i < completionCount; i++) {
                        memberId = memberIds[Math.floor(Math.random() * memberIds.length)];
                        bountyId = bountyIds[Math.floor(Math.random() * bountyIds.length)];
                        completedAt = randomDateInRange(60, 90) // Last 60-90 days
                        ;
                        bountyEvents.push({
                            hub_id: DEMO_HUB_ID,
                            member_id: memberId,
                            bounty_id: bountyId,
                            status: "completed",
                            created_at: completedAt.toISOString(),
                        });
                    }
                    if (!(bountyEvents.length > 0)) return [3 /*break*/, 24];
                    i = 0;
                    _e.label = 20;
                case 20:
                    if (!(i < bountyEvents.length)) return [3 /*break*/, 23];
                    batch = bountyEvents.slice(i, i + batchSize);
                    return [4 /*yield*/, db.from("bounty_events").insert(batch)];
                case 21:
                    insertError = (_e.sent()).error;
                    if (insertError) {
                        throw new Error("Failed to insert bounty_events: ".concat(insertError.message));
                    }
                    _e.label = 22;
                case 22:
                    i += batchSize;
                    return [3 /*break*/, 20];
                case 23:
                    console.log("   \u2705 Created ".concat(bountyEvents.length, " bounty completion events"));
                    _e.label = 24;
                case 24:
                    // Summary
                    console.log("\n" + "=".repeat(60));
                    console.log("✅ Demo data seeding complete!");
                    console.log("=".repeat(60));
                    console.log("\uD83D\uDCCA Summary for DEMO_HUB_ID=".concat(DEMO_HUB_ID, ":"));
                    console.log("   \u2022 Members: ".concat(members.length, " (spread over last 120 days)"));
                    console.log("   \u2022 Activity logs (messages): ".concat(activityLogs.length, " (last 90 days)"));
                    console.log("   \u2022 Bounty completions: ".concat(bountyCompletionCount, " (last 60-90 days)"));
                    console.log("\n🎯 Visit /overview to see the data in action!");
                    console.log("\n📋 Tables seeded:");
                    console.log("   • members → Total Members KPI");
                    console.log("   • activity_logs (type='posted') → Messages KPI + Engagement Trend chart");
                    console.log("   • bounty_events (status='completed') → Bounties Completed KPI");
                    console.log("   • Daily active users calculated from unique member_ids in activity_logs + bounty_events per day");
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
});
