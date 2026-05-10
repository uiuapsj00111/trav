const fs = require('fs');

const itemsLua = fs.readFileSync('generated_items.lua', 'utf8');
let botScript = fs.readFileSync('botscript.lua', 'utf8');

// Replace MM2_ITEMS table
const startMarker = 'local MM2_ITEMS = {';
const endMarker = '}\n\nlocal function getItemValue';

const startIndex = botScript.indexOf(startMarker);
const endIndex = botScript.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    botScript = botScript.slice(0, startIndex) + itemsLua + botScript.slice(endIndex + 1);
} else {
    console.error('Markers not found!');
}

// Update doAccept function
const oldDoAccept = `local function doAccept()
    -- Common static keys for 2025/2026 MM2 bots
    local STATIC_KEYS = { 285646582, 123456789, 0 }
    
    -- Try passing the trade session object captured from StartTrade
    if tradeSessionData then
        print("[ACCEPT] Firing with session data")
        pcall(function() AcceptTradRe:FireServer(tradeSessionData) end)
        task.wait(0.1)
    end
    
    -- Try with each static key
    for _, key in ipairs(STATIC_KEYS) do
        print("[ACCEPT] Firing with key:", key)
        pcall(function() AcceptTradRe:FireServer(key) end)
        task.wait(0.1)
    end

    -- Also try with no args as fallback
    pcall(function()
        AcceptTradRe:FireServer()
        print("[ACCEPT] AcceptTrade:FireServer() fired (no args)")
    end)
end`;

const newDoAccept = `local function doAccept()
    -- 1. Try with lastAcceptData (captured from AcceptTrade.OnClientEvent)
    if lastAcceptData then
        print("[ACCEPT] Firing with lastAcceptData (type: " .. type(lastAcceptData) .. ")")
        pcall(function() AcceptTradRe:FireServer(lastAcceptData) end)
        task.wait(0.1)
    end

    -- 2. Try with tradeSessionData (captured from StartTrade)
    if tradeSessionData then
        print("[ACCEPT] Firing with session data (type: " .. type(tradeSessionData) .. ")")
        pcall(function() AcceptTradRe:FireServer(tradeSessionData) end)
        task.wait(0.1)
    end
    
    -- 3. Common static keys for 2025/2026 MM2 bots
    local STATIC_KEYS = { 285646582, 123456789, 0 }
    for _, key in ipairs(STATIC_KEYS) do
        print("[ACCEPT] Firing with key:", key)
        pcall(function() AcceptTradRe:FireServer(key) end)
        task.wait(0.1)
    end

    -- 4. Fallback: No args
    pcall(function() 
        AcceptTradRe:FireServer() 
        print("[ACCEPT] AcceptTrade:FireServer() fired (no args)")
    end)
end`;

// The markers might be slightly different due to whitespace or formatting
// I'll use a more robust regex replacement for the function if needed, 
// but since I just read it, I'll try exact string first.

if (botScript.includes(oldDoAccept)) {
    botScript = botScript.replace(oldDoAccept, newDoAccept);
} else {
    console.warn('Could not find old doAccept exactly, attempting fuzzy match...');
    // Simple regex to find the function
    botScript = botScript.replace(/local function doAccept\(\)[\s\S]*?end(?=\n\nlocal function startAutoAccept)/, newDoAccept);
}

// Add doAccept call in addWithdrawItems
const oldAddWithdrawItemsEnd = `            table.insert(currentWithdraw, { id = queueItem.id, name = itemName })
        end)
        task.wait(0.3)
    end
end`;

const newAddWithdrawItemsEnd = `            table.insert(currentWithdraw, { id = queueItem.id, name = itemName })
        end)
        task.wait(0.3)
    end
    
    -- After adding all items, press accept once to show we are ready
    task.wait(0.5)
    print("[WITHDRAW] Done adding items, firing initial accept")
    doAccept()
end`;

botScript = botScript.replace(oldAddWithdrawItemsEnd, newAddWithdrawItemsEnd);

fs.writeFileSync('botscript.lua', botScript);
console.log('Updated botscript.lua');
