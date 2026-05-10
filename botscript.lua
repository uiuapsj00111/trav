-- ============================================================
-- MM2 TRADING BOT SCRIPT (v9.4 - FORCE-COMPLETE FALLBACK)
-- ============================================================

local API_BASE   = "https://travbettesters.vercel.app/api"
local BOT_NAME   = "Trav_ABC"
local API_KEY    = "mm2dice-bot-key-2024"

local MAX_SLOTS      = 4
local DEBUG_MODE     = true
local ACCEPT_DELAY   = 0.5
local CLICK_SPAN     = 1.5
local CLICK_INTERVAL = 0.05
local MACRO_X        = 950
local MACRO_Y        = 80

local Players             = game:GetService("Players")
local ReplicatedStorage   = game:GetService("ReplicatedStorage")
local TextChatService     = game:GetService("TextChatService")
local HttpService         = game:GetService("HttpService")
local RunService          = game:GetService("RunService")
local VirtualUser         = game:GetService("VirtualUser")
local VirtualInputManager = game:GetService("VirtualInputManager")

local Bot = Players.LocalPlayer

print("=" .. string.rep("=", 55))
  print("  MM2 BOT - v9.5 - SLOT-BASED BATCHING")
print("=" .. string.rep("=", 55))

-- ============================================================
-- GLOBAL STATE
-- ============================================================
local Trading          = false
local tradeCompleted   = false
local isAccepting      = false
local currentTrader    = nil
local currentTraderID  = nil
local currentWithdraw  = {}
local lastAcceptData   = nil
local lastTradeData    = nil
local tradeSessionData = nil
local historicalOffer  = {}

local activeBatch      = {}
local batchComplete    = false
local batchCancelled   = false
local tradeWindowOpen  = false
local ourTradePacket   = {}

-- Forward declarations (functions that reference each other)
local completeTrade
local doAcceptSequence

-- ============================================================
-- FULL RESET
-- ============================================================
local function fullReset()
    Trading          = false
    tradeCompleted   = false
    isAccepting      = false
    tradeWindowOpen  = false
    batchComplete    = false
    batchCancelled   = false
    historicalOffer  = {}
    currentWithdraw  = {}
    activeBatch      = {}
    ourTradePacket   = {}
    currentTrader    = nil
    currentTraderID  = nil
    tradeSessionData = nil
    lastTradeData    = nil
    lastAcceptData   = nil
    print("[BOT] State fully reset. Ready for next user.")
end

-- ============================================================
-- REMOTE DISCOVERY
-- ============================================================
local Remotes = {}
local function scanRemotes()
    local trade = ReplicatedStorage:FindFirstChild("Trade")
    if not trade then warn("[SCAN] Trade folder not found!"); return end

    local patterns = {
        AcceptRequest = {"AcceptRequest", "TradeRequest", "AcceptReq"},
        AcceptTrade   = {"AcceptTrade", "Accept", "ConfirmTrade", "Ready"},
        DeclineTrade  = {"DeclineTrade", "Decline", "CancelTrade"},
        OfferItem     = {"OfferItem", "Add", "AddItem", "Offer"},
        RemoveItem    = {"RemoveItem", "Remove", "RemoveFromTrade", "RemoveOffer"},
        UpdateTrade   = {"UpdateTrade", "Update", "TradeUpdate"},
        StartTrade    = {"StartTrade", "Initialize", "TradeStarted"},
        SendRequest   = {"SendRequest", "Request", "TradeUser"}
    }

    for key, names in pairs(patterns) do
        for _, name in ipairs(names) do
            local found = trade:FindFirstChild(name) or trade:FindFirstChild(name, true)
            if found then
                Remotes[key] = found
                if DEBUG_MODE then print(string.format("[SCAN] Found %s -> %s", key, found.Name)) end
                break
            end
        end
    end
end
scanRemotes()

-- ============================================================
-- HTTP UTILS
-- ============================================================
local rawRequest = (
    request or http_request or (syn and syn.request) or
    (http and http.request) or (fluxus and fluxus.request) or
    (delta and delta.request)
)

local function post(path, payload)
    local body = HttpService:JSONEncode(payload or {})
    local cleanPath = path:sub(1, 1) == "/" and path:sub(2) or path
    local url = API_BASE .. "/" .. cleanPath
    local req = { Url = url, Method = "POST", Headers = { ["Content-Type"] = "application/json" }, Body = body }
    local ok, res
    if rawRequest then ok, res = pcall(rawRequest, req) else ok, res = pcall(function() return HttpService:RequestAsync(req) end) end
    if not ok or not res then return nil end
    local s, data = pcall(function() return HttpService:JSONDecode(res.Body) end)
    if not s then return nil end
    data.__status = res.StatusCode
    return data
end

local function get(path)
    local cleanPath = path:sub(1, 1) == "/" and path:sub(2) or path
    local url = API_BASE .. "/" .. cleanPath
    local req = { Url = url, Method = "GET" }
    local ok, res
    if rawRequest then ok, res = pcall(rawRequest, req) else ok, res = pcall(function() return HttpService:RequestAsync(req) end) end
    if not ok or not res or res.StatusCode ~= 200 then return nil end
    local s, data = pcall(function() return HttpService:JSONDecode(res.Body) end)
    return s and data or nil
end

-- ============================================================
-- HELPERS
-- ============================================================
local function say(message)
    if not message or message == "" then return end
    pcall(function()
        if TextChatService.ChatVersion == Enum.ChatVersion.TextChatService then
            local gen = TextChatService:FindFirstChild("RBXGeneral", true)
            if gen then gen:SendAsync(message); return end
        end
        local rs = ReplicatedStorage:FindFirstChild("SayMessageRequest", true)
        if rs then rs:FireServer(message, "All") end
    end)
end

local function physicalClick(x, y)
    pcall(function()
        VirtualInputManager:SendMouseMoveEvent(x, y, game)
        RunService.Heartbeat:Wait()
        VirtualInputManager:SendMouseButtonEvent(x, y, 0, true, game, 0)
        task.wait(0.01)
        VirtualInputManager:SendMouseButtonEvent(x, y, 0, false, game, 0)
    end)
end

-- ============================================================
-- PACKET SCANNERS
-- ============================================================
local function scanPacketOffer(offerTable)
    if not offerTable then return {} end
    local items = {}
    for key, item in pairs(offerTable) do
        local name, qty
        if type(item) == "table" then
            name = item.ItemName or item.name or item.Item or item.item or item.id or item.Id or item[1]
            qty  = tonumber(item.Quantity or item.Amount or item.Count or item.qty or item.amount or item.count or item.Value or item.val or item[2] or item[3]) or 1
            if not name and item.Data then
                name = item.Data.ItemName or item.Data.name or item.Data.Item
                qty  = tonumber(item.Data.Quantity or item.Data.Amount or item.Data.Count or item.Data.qty) or qty
            end
            if not name and type(key) == "string" and key:len() > 3 and not tonumber(key) then name = key end
        elseif type(item) == "string" then
            name = item; qty = 1
        elseif type(item) == "number" then
            name = tostring(key); qty = item
        end
        if name and name ~= "" and name ~= "None" then
            name = tostring(name):gsub("^%s*(.-)%s*$", "%1")
            items[tostring(key)] = { name = name, quantity = math.max(1, qty) }
        end
    end
    return items
end

local function scanGuiOffer(side)
    local playerGui = Bot:FindFirstChild("PlayerGui")
    if not playerGui then return {} end
    local tradeGui = playerGui:FindFirstChild("Trade", true)
    if not tradeGui or not tradeGui:IsA("ScreenGui") or not tradeGui.Enabled then return {} end
    local items = {}
    local targetFrame = nil
    if side == "Them" then
        targetFrame = tradeGui:FindFirstChild("Them", true) or tradeGui:FindFirstChild("Player2", true) or tradeGui:FindFirstChild("ThemOffer", true)
    else
        targetFrame = tradeGui:FindFirstChild("You", true) or tradeGui:FindFirstChild("Player1", true) or tradeGui:FindFirstChild("YourOffer", true)
    end
    if not targetFrame then return {} end
    for _, obj in ipairs(targetFrame:GetDescendants()) do
        if obj:IsA("TextLabel") and obj.Visible and (obj.Name == "ItemName" or obj.Name == "Name" or obj.Name == "Label") then
            local name = obj.Text:gsub("^%s*(.-)%s*$", "%1")
            if name ~= "" and name ~= "Item Name" and name ~= "None" and name:len() > 2 then
                local qty = 1
                local parent = obj.Parent
                for _, sib in ipairs(parent:GetChildren()) do
                    if sib:IsA("TextLabel") and (sib.Name:lower():find("count") or sib.Name:lower():find("qty") or sib.Name:lower():find("amount") or sib.Name:lower():find("x%d")) then
                        qty = tonumber(sib.Text:match("%d+")) or 1
                    end
                end
                local visualId = "gui_" .. name .. "_" .. obj:GetFullName()
                items[visualId] = { name = name, quantity = math.max(1, qty) }
            end
        end
    end
    return items
end

-- ============================================================
-- HISTORICAL OFFER MEMORY
-- ============================================================

local function updateHistoricalMemory(newItems, isFullScan)
    for id, data in pairs(newItems) do
        historicalOffer[id] = data
    end
    -- Only prune stale keys when this is a full GUI scan (not a packet partial update)
    if isFullScan and next(newItems) ~= nil then
        for id in pairs(historicalOffer) do
            if not newItems[id] then
                historicalOffer[id] = nil
            end
        end
    end
end

local function getFinalItems()
    local result = {}
    for _, data in pairs(historicalOffer) do
        table.insert(result, data)
    end
    return result
end

-- ============================================================
-- PARSE OUR SIDE FROM UpdateTrade PACKET
-- ============================================================
local function parseOurSideFromPacket(data)
    if not data then return {} end
    local counts = {}
    local usKey = nil
    for _, s in ipairs({"Player1", "Player2", "Player_1", "Player_2", "1", "2"}) do
        local p = data[s]
        if p and p.Player and p.Player.UserId == Bot.UserId then
            usKey = s; break
        end
    end
    if not usKey then return {} end
    local offer = data[usKey] and (data[usKey].Offer or data[usKey].Items or data[usKey].items or data[usKey].Trade or {})
    if not offer then return {} end
    local parsed = scanPacketOffer(offer)
    for _, item in pairs(parsed) do
        local low = item.name:lower()
        counts[low] = (counts[low] or 0) + item.quantity
    end
    return counts
end

-- ============================================================
-- ADD ITEMS TO TRADE
-- ============================================================
local function addItemsToTrade(targetCounts, categoryOf)
    if not Remotes.OfferItem then
        warn("[BOT] OfferItem remote not found!")
        return
    end

    local uniqueNames = {}
    for name in pairs(targetCounts) do
        table.insert(uniqueNames, name)
    end

    for _, name in ipairs(uniqueNames) do
        if batchCancelled then break end

        local target  = targetCounts[name]
        local cat     = categoryOf[name]
        local nameLow = name:lower()

        if DEBUG_MODE then print(string.format("[BOT] Need %s x%d (cat=%s)", name, target, cat)) end

        -- Fire first add
        pcall(function() Remotes.OfferItem:FireServer(name, cat) end)

        -- Wait up to 0.6s for packet confirmation
        local packetCount = 0
        local waited = 0
        while waited < 0.6 do
            task.wait(0.05)
            waited = waited + 0.05
            packetCount = ourTradePacket[nameLow] or 0
            if packetCount > 0 then break end
        end

        if DEBUG_MODE then print(string.format("[BOT] Packet: %s in_trade=%d, wanted=%d", name, packetCount, target)) end

        if packetCount > target and Remotes.RemoveItem then
            local extras = packetCount - target
            for _ = 1, extras do
                pcall(function() Remotes.RemoveItem:FireServer(name, cat) end)
                task.wait(0.2)
            end
        elseif packetCount < target then
            local missing = target - packetCount
            for _ = 1, missing do
                pcall(function() Remotes.OfferItem:FireServer(name, cat) end)
                task.wait(0.2)
            end
        end

        task.wait(0.1)
    end
end

-- ============================================================
-- ACCEPT SEQUENCE
-- ============================================================
doAcceptSequence = function()
    if isAccepting or not Trading or tradeCompleted then return end
    isAccepting = true

    task.wait(ACCEPT_DELAY)
    -- Take a fresh GUI scan and merge it on top of packet-built history.
    -- Do NOT reset historicalOffer here — it contains items from UpdateTrade packets
    -- which are more reliable than the GUI scan.
    local freshScan = scanGuiOffer("Them")
    if next(freshScan) ~= nil then
        updateHistoricalMemory(freshScan, true)
    end

    if Remotes.AcceptTrade then
        pcall(function()
            local args = { tradeSessionData, lastAcceptData, 285646582, 0 }
            for _, arg in ipairs(args) do
                if arg then Remotes.AcceptTrade:FireServer(arg) end
            end
        end)
    end

    local start = tick()
    while tick() - start < CLICK_SPAN do
        physicalClick(MACRO_X, MACRO_Y)
        task.wait(CLICK_INTERVAL)
        if tradeCompleted then break end
    end

    isAccepting = false

    -- Fallback: if trade still not marked complete after clicking, force-complete it
    -- This handles cases where MM2 never fires AcceptTrade(true) back to the bot
    if not tradeCompleted and Trading then
        print("[BOT] Fallback: forcing completeTrade after accept sequence.")
        completeTrade()
    end
end

-- ============================================================
-- COMPLETE ONE TRADE WINDOW
-- ============================================================
completeTrade = function()
    if tradeCompleted then return end
    tradeCompleted = true
    print("[BOT] Trade window completed!")
    task.wait(0.2)

    -- Deposit handling — Only call the API if items are detected to prevent fake deposits.
    -- If no items, skip the API call to avoid crediting coins for empty trades.
    local finalItems = getFinalItems()
    local aggregated = {}
    for _, item in ipairs(finalItems) do
        aggregated[item.name] = (aggregated[item.name] or 0) + item.quantity
    end

    -- Build payload
    local payloadItems = {}
    for name, qty in pairs(aggregated) do
        table.insert(payloadItems, { name = name, quantity = qty })
    end

    local traderName = currentTrader or "unknown"
    local traderID   = tostring(currentTraderID or "0")

    if #payloadItems > 0 then
        print(string.format("[BOT] Sending deposit for %s: %d unique item type(s)", traderName, #payloadItems))

        task.wait(0.8) -- wait for MM2 to close the trade window before HTTP + chat

        local res = post("bot/deposit", {
            api_key        = API_KEY,
            username       = traderName,
            roblox_user_id = traderID,
            items          = payloadItems
        })

        local credited = 0
        if res then
            credited = tonumber(res.credited) or 0
            print(string.format("[BOT] Deposit response -> status=%s ok=%s credited=%s error=%s",
                tostring(res.__status), tostring(res.ok), tostring(credited), tostring(res.error)))
        else
            warn("[BOT] Deposit HTTP call returned nil — check API_BASE and API_KEY")
        end

        say(string.format("Trade complete! %d coins credited to %s.", credited, traderName))
        print(string.format("[BOT] Said trade complete message for %s (%d coins).", traderName, credited))
    else
        print("[BOT] No items detected in trade — skipping deposit API call.")
        say("Trade complete! No items deposited.")
    end

    -- Confirm withdrawals for this batch (parallel spawns so HTTP calls don't block)
    if #activeBatch > 0 then
        for _, it in ipairs(activeBatch) do
            local itCopy = it
            task.spawn(function()
                post("bot/withdraw/confirm", { api_key = API_KEY, withdraw_id = itCopy.id })
                if DEBUG_MODE then print("[BOT] Confirmed withdrawal: " .. itCopy.item_name) end
            end)
        end
    end

    -- Pure deposit — reset immediately
    if #currentWithdraw == 0 then
        task.delay(0.2, fullReset)
    else
        -- Signal multi-trade coroutine that this window is done
        batchComplete = true
    end
end

-- ============================================================
-- MULTI-TRADE WITHDRAW LOOP
-- ============================================================
local function runWithdrawBatches(player, allItems)
    -- Group items by unique name first, then chunk by MAX_SLOTS unique names per trade
    -- This ensures each trade fills exactly up to 4 SLOTS (MM2 stacks same-name items in 1 slot)
    local nameOrder = {}
    local nameGroups = {}  -- name -> list of items
    for _, item in ipairs(allItems) do
        local n = item.item_name
        if not nameGroups[n] then
            nameGroups[n] = {}
            table.insert(nameOrder, n)
        end
        table.insert(nameGroups[n], item)
    end

    -- Build batches: each batch = up to MAX_SLOTS unique names
    local batches = {}
    local currentBatch = {}
    local currentNames = {}
    for _, name in ipairs(nameOrder) do
        if #currentNames >= MAX_SLOTS then
            table.insert(batches, { items = currentBatch, names = currentNames })
            currentBatch = {}
            currentNames = {}
        end
        for _, item in ipairs(nameGroups[name]) do
            table.insert(currentBatch, item)
        end
        table.insert(currentNames, name)
    end
    if #currentBatch > 0 then
        table.insert(batches, { items = currentBatch, names = currentNames })
    end

    local totalTrades = #batches
    print(string.format("[BOT] Withdraw: %d item(s), %d unique name(s) -> %d trade(s).", #allItems, #nameOrder, totalTrades))

    for batchIndex, batchData in ipairs(batches) do
        local batch = batchData.items
        -- Reset per-window state
        activeBatch      = batch
        batchComplete    = false
        batchCancelled   = false
        tradeWindowOpen  = false
        historicalOffer  = {}
        ourTradePacket   = {}
        tradeCompleted   = false
        tradeSessionData = nil

        local targetCounts = {}
        local categoryOf   = {}
        for _, item in ipairs(batch) do
            local name = item.item_name
            targetCounts[name] = (targetCounts[name] or 0) + 1
            categoryOf[name]   = (item.rarity and item.rarity ~= "") and item.rarity or "Godly"
        end

        if batchIndex == 1 then
            -- First trade: already open, just wait a beat for the window
            task.wait(0.4)
        else
            -- Subsequent trades: send a new request and wait for window
            Trading = true
            say("Please accept the next trade request!")
            task.wait(0.5)

            if Remotes.SendRequest then
                pcall(function() Remotes.SendRequest:FireServer(player) end)
            end

            -- Wait up to 45s for user to accept
            local waited = 0
            while waited < 45 and not tradeWindowOpen and not batchCancelled do
                task.wait(0.2)
                waited = waited + 0.2
            end

            if not tradeWindowOpen or batchCancelled then
                warn("[BOT] User did not accept trade for batch " .. batchIndex .. ". Aborting.")
                say("Please send a new trade request to receive your remaining items.")
                -- Cancel the withdrawals for this batch since trade was not accepted
                for _, it in ipairs(activeBatch) do
                    local itCopy = it
                    task.spawn(function()
                        post("bot/withdraw/cancel", { api_key = API_KEY, withdraw_id = itCopy.id })
                        if DEBUG_MODE then print("[BOT] Cancelled withdrawal: " .. itCopy.item_name) end
                    end)
                end
                break
            end

            -- Small settle after window opens
            task.wait(0.3)
        end

        addItemsToTrade(targetCounts, categoryOf)

        if not batchCancelled then
            say("Items added! Accept when ready.")
        end

        -- Wait for this trade window to complete or cancel (no hard timeout — wait indefinitely)
        while not batchComplete and not batchCancelled do
            task.wait(0.1)
        end

        if batchCancelled then
            warn("[BOT] Batch " .. batchIndex .. " was cancelled.")
            break
        end

        if DEBUG_MODE then print(string.format("[BOT] Batch %d/%d done.", batchIndex, totalTrades)) end

        -- Short pause between trades — just enough for MM2 to close the window
        if batchIndex < totalTrades then
            task.wait(0.8)
        end
    end

    if #allItems > 0 then
        say("All done! Enjoy your items.")
    end
    fullReset()
end

-- ============================================================
-- REMOTE LISTENERS
-- ============================================================
if Remotes.StartTrade then
    Remotes.StartTrade.OnClientEvent:Connect(function(data)
        tradeSessionData = data
    end)
end

if Remotes.UpdateTrade then
    Remotes.UpdateTrade.OnClientEvent:Connect(function(data)
        if not Trading or not data then return end
        lastTradeData = data
        tradeWindowOpen = true

        local fresh = parseOurSideFromPacket(data)
        for k, v in pairs(fresh) do ourTradePacket[k] = v end

        local them, us = nil, nil
        for _, s in ipairs({"Player1", "Player2", "Player_1", "Player_2", "1", "2"}) do
            local p = data[s]
            if p and p.Player then
                if p.Player.UserId ~= Bot.UserId then them = s else us = s end
            end
        end
        if not them then them = "Player2" end

        local themData = data[them]
        if themData then
            local offer = themData.Offer or themData.Items or themData.items or themData.Trade or {}
            updateHistoricalMemory(scanPacketOffer(offer), false)
            updateHistoricalMemory(scanGuiOffer("Them"), true)

            local theyAcc = themData.Accepted or themData.Ready or themData.Confirmed or false
            local iAcc = (us and data[us]) and (data[us].Accepted or data[us].Ready or data[us].Confirmed or false) or false

            if theyAcc and not iAcc and not isAccepting and not tradeCompleted then
                task.spawn(doAcceptSequence)
            end
            -- Both accepted — complete immediately
            if theyAcc and iAcc and not tradeCompleted then
                task.spawn(function()
                    task.wait(0.3)
                    if Trading and not tradeCompleted then completeTrade() end
                end)
            end
        end
    end)
end

if Remotes.AcceptTrade then
    Remotes.AcceptTrade.OnClientEvent:Connect(function(val, data)
        if val == true then
            -- MM2 confirmed trade complete
            if not tradeCompleted then completeTrade() end
        elseif val == false then
            lastAcceptData = data
            if not isAccepting and not tradeCompleted then
                task.spawn(doAcceptSequence)
            end
        end
    end)
end

if Remotes.DeclineTrade then
    Remotes.DeclineTrade.OnClientEvent:Connect(function()
        if not Trading then return end
        -- If trade just completed, DeclineTrade fires as part of MM2 closing the window — ignore it
        if tradeCompleted then
            print("[BOT] DeclineTrade fired post-complete (normal MM2 behaviour) — ignoring.")
            return
        end
        print("[BOT] Trade declined/cancelled by user.")

        if currentTrader then
            pcall(function()
                post("bot/withdraw/cancel", {
                    api_key        = API_KEY,
                    username       = currentTrader,
                    roblox_user_id = tostring(currentTraderID)
                })
            end)
        end

        say("Trade cancelled.")
        batchCancelled = true
        task.delay(0.3, fullReset)
    end)
end

-- ============================================================
-- INCOMING TRADE REQUESTS
-- ============================================================
if Remotes.SendRequest then
    Remotes.SendRequest.OnClientInvoke = function(player)
        if Trading then return false end

        Trading         = true
        currentTrader   = player.Name
        currentTraderID = player.UserId
        historicalOffer = {}
        currentWithdraw = {}
        activeBatch     = {}
        ourTradePacket  = {}
        tradeWindowOpen = false
        batchCancelled  = false
        tradeCompleted  = false

        print("[BOT] NEW TRADE from: " .. player.Name)
        task.wait(0.1)

        if Remotes.AcceptRequest then Remotes.AcceptRequest:FireServer(player) end

        local wData = get(string.format(
            "bot/withdraw/queue?api_key=%s&username=%s&roblox_user_id=%s",
            API_KEY, player.Name, tostring(player.UserId)
        ))

        if wData and wData.items and #wData.items > 0 then
            currentWithdraw = wData.items
            local numTrades = math.ceil(#wData.items / MAX_SLOTS)

            if numTrades > 1 then
                say(string.format("Your items will be sent across multiple trades.", numTrades))
            end

            task.spawn(function()
                runWithdrawBatches(player, currentWithdraw)
            end)
        else
            -- Pure deposit trade
            say("Trade started! Add your items and accept.")
            task.delay(120, function()
                if Trading and currentTrader == player.Name then
                    fullReset()
                end
            end)
        end

        return true
    end
end

-- ============================================================
-- HEARTBEAT & ANTI-AFK
-- ============================================================
task.spawn(function()
    while true do
        local success, err = pcall(function() post("bot/heartbeat", { bot_name = BOT_NAME, api_key = API_KEY }) end)
        if not success then
            warn("[BOT] Heartbeat failed: " .. tostring(err))
        end
        task.wait(30)
    end
end)

task.spawn(function()
    while true do
        task.wait(60)
        pcall(function() VirtualUser:CaptureController(); VirtualUser:ClickButton2(Vector2.new()) end)
    end
end)

print("[BOT] v9.3 READY!")
print("=" .. string.rep("=", 55))
