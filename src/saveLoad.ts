import { BinaryReader, BinaryWriter, Group, Unit, MapPlayer, File, SyncRequest, base64Encode, base64Decode, Item} from "w3ts"

let dialog : framehandle
let title : framehandle
let buttons : framehandle[] = []
let codes : string[] = []
let names : string[] = []

let confirmation : framehandle

let deleteIndex: number

const slotCount = 9

enum Mode {
	load,
	save
}
let mode : Mode = Mode.load

function loadCode(code: string) {
	const reader = new BinaryReader(base64Decode(code))

	// Check if is is not a copied load code
	const name = reader.readString()
	if (name !== MapPlayer.fromEvent().name) {
		 DisplayTimedTextToPlayer(GetTriggerPlayer(), 0, 0, 10, string.format("Load code name is %s while your name is %s", name, MapPlayer.fromEvent().name))
		 return
	}
	
	// Remove old hero
	let g = new Group()
    g.enumUnitsOfPlayer(MapPlayer.fromEvent(), Filter(() => !IsUnitType(GetEnumUnit(), UNIT_TYPE_HERO)))
	const u = g.first
	g.first.destroy()

	// Load new
	MapPlayer.fromEvent().setState(PLAYER_STATE_RESOURCE_GOLD, reader.readInt32())
	let unit = new Unit(MapPlayer.fromEvent(), FourCC("H001"), GetRectCenterX(gg_rct_revive), GetRectCenterY(gg_rct_revive), u.facing)
	bj_lastCreatedUnit = unit.handle
	
	unit.experience = reader.readFloat()
	unit.strength = reader.readInt32()
	unit.agility = reader.readInt32()
	unit.intelligence = reader.readInt32()
	
	for (let i = 0; i < 6; i++) {
		const id = reader.readUInt32()
		if (id === 0) {
			continue
		}
		print(id)
		unit.addItem(new Item(id, 0, 0))
		unit = Unit.fromHandle(bj_lastCreatedUnit)
	}
}

function generateCode() : [string, string] {
    let g = new Group()
    g.enumUnitsOfPlayer(MapPlayer.fromEvent(), Filter(() => !IsUnitType(GetEnumUnit(), UNIT_TYPE_HERO)))
    const u = g.first

    const writer = new BinaryWriter();
    writer.writeString(u.owner.name)
    writer.writeInt32(u.owner.getState(PLAYER_STATE_RESOURCE_GOLD))

    writer.writeFloat(u.experience);
    writer.writeInt32(u.strength)
    writer.writeInt32(u.agility)
    writer.writeInt32(u.intelligence)

    for (let i = 0; i < 6; i++) {
		const id = u.getItemInSlot(i).typeId
		print(id)
        writer.writeUInt32(id);
    }
        
    return [u.name + " - lvl " + tostring(u.level), base64Encode(writer.toString())]
}

export function generate() {
	dialog = BlzCreateFrame("ScriptDialog", BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0)
	BlzFrameSetAbsPoint(dialog, FRAMEPOINT_CENTER, 0.4, 0.355)
	BlzFrameSetSize(dialog, 0.25, 0.3825)
	BlzFrameSetVisible(dialog, false)

	title = BlzCreateFrame("EscMenuTitleTextTemplate", dialog, 0, 0)
	BlzFrameSetPoint(title, FRAMEPOINT_TOP, dialog, FRAMEPOINT_TOP, 0.0, -0.03)
	BlzFrameSetTextColor(title, BlzConvertColor(255, 255, 255, 255))
	
	const closeButton = BlzCreateFrame("ScriptDialogButton", dialog, 0, 0)
	BlzFrameSetSize(closeButton, 0.03, 0.03)
	BlzFrameSetPoint(closeButton, FRAMEPOINT_TOPRIGHT, dialog, FRAMEPOINT_TOPRIGHT, 0, 0)
	BlzFrameSetText(closeButton, "X")

	const closeTrigger = CreateTrigger()
	BlzTriggerRegisterFrameEvent(closeTrigger, closeButton, FRAMEEVENT_CONTROL_CLICK)
	TriggerAddAction(closeTrigger, () => {
		if (GetLocalPlayer() === GetTriggerPlayer()) {
			BlzFrameSetVisible(dialog, false)
		}
	})

	let parent = null
	for (let i = 0; i < slotCount; i++) {
		buttons[i] = BlzCreateFrame("ScriptDialogButton", dialog, 0, 0)
		BlzFrameSetSize(buttons[i], 0.16, 0.03)

		if (i === 0) {
			BlzFrameSetPoint(buttons[i], FRAMEPOINT_TOPLEFT, dialog, FRAMEPOINT_TOPLEFT, 0.03, -0.067)
		} else {
			BlzFrameSetPoint(buttons[i], FRAMEPOINT_TOPLEFT, parent, FRAMEPOINT_BOTTOMLEFT, 0.0, -0.0013)
		}

		const deleteButton = BlzCreateFrame("ScriptDialogButton", dialog, 0, 0)
		BlzFrameSetSize(deleteButton, 0.03, 0.03)
		BlzFrameSetPoint(deleteButton, FRAMEPOINT_TOPLEFT, buttons[i], FRAMEPOINT_TOPRIGHT, 0.0013, 0.0)
		BlzFrameSetText(deleteButton, "X")
		
		// Actions
		const loadTrigger = CreateTrigger()
		BlzTriggerRegisterFrameEvent(loadTrigger, buttons[i], FRAMEEVENT_CONTROL_CLICK)

		const index = i
		TriggerAddAction(loadTrigger, () => {
			if (mode === Mode.load) {
				if (codes[index] == "") {
					return;
				}
				let code = codes[index]
				new SyncRequest(MapPlayer.fromEvent(), code).then((res, req) => {
					code = res.data
				});
				loadCode(code)
			} else {
				let tuple = generateCode()
				if (GetLocalPlayer() === GetTriggerPlayer()) {
					File.write("MCFC/" + tostring(index) + ".txt", tuple[0] + "," + tuple[1])
					names[index] = tuple[0]
					codes[index] = tuple[1]
				}
			}
			toggleVisibility()
		})

		const deleteTrigger = CreateTrigger()
		BlzTriggerRegisterFrameEvent(deleteTrigger, deleteButton, FRAMEEVENT_CONTROL_CLICK)
		TriggerAddAction(deleteTrigger, () => {
			if (GetLocalPlayer() === GetTriggerPlayer()) {
				BlzFrameSetVisible(dialog, false)
				BlzFrameSetVisible(confirmation, true)
				deleteIndex = index
			}
		})

		parent = buttons[i]
	}

	confirmation = BlzCreateFrame("ScriptDialog", BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0)
	BlzFrameSetAbsPoint(confirmation, FRAMEPOINT_CENTER, 0.4, 0.335)
	BlzFrameSetSize(confirmation, 0.336, 0.152)
	BlzFrameSetVisible(confirmation, false)

	let confirmationTitle = BlzCreateFrame("EscMenuTitleTextTemplate", confirmation, 0, 0)
	BlzFrameSetPoint(confirmationTitle, FRAMEPOINT_TOP, confirmation, FRAMEPOINT_TOP, 0.0, -0.03)
	BlzFrameSetTextColor(confirmationTitle, BlzConvertColor(255, 255, 255, 255))
	BlzFrameSetText(confirmationTitle, "Are you sure you want to delete this slot?")

	const yesButton = BlzCreateFrame("ScriptDialogButton", confirmation, 0, 0)
	BlzFrameSetSize(yesButton, 0.129, 0.035)
	BlzFrameSetPoint(yesButton, FRAMEPOINT_BOTTOMLEFT, confirmation, FRAMEPOINT_BOTTOMLEFT, 0.035, 0.03)
	BlzFrameSetText(yesButton, "Yes")

	const yesTrigger = CreateTrigger()
	BlzTriggerRegisterFrameEvent(yesTrigger, yesButton, FRAMEEVENT_CONTROL_CLICK)
	TriggerAddAction(yesTrigger, () => {
		if (GetLocalPlayer() === GetTriggerPlayer()) {
			BlzFrameSetVisible(confirmation, false)
			BlzFrameSetVisible(dialog, true)
			BlzFrameSetText(buttons[deleteIndex], "")
			File.write("MCFC/" + tostring(deleteIndex) + ".txt", "")
			names[deleteIndex] = ""
			codes[deleteIndex] = ""
		}
	})

	const noButton = BlzCreateFrame("ScriptDialogButton", confirmation, 0, 0)
	BlzFrameSetSize(noButton, 0.129, 0.035)
	BlzFrameSetPoint(noButton, FRAMEPOINT_LEFT, yesButton, FRAMEPOINT_RIGHT, 0.006, 0)
	BlzFrameSetText(noButton, "No")

	const noTrigger = CreateTrigger()
	BlzTriggerRegisterFrameEvent(noTrigger, noButton, FRAMEEVENT_CONTROL_CLICK)
	TriggerAddAction(noTrigger, () => {
		if (GetLocalPlayer() === GetTriggerPlayer()) {
			BlzFrameSetVisible(confirmation, false)
			BlzFrameSetVisible(dialog, true)
		}
	})
}

export function loadData() {
	for (let i = 0; i < slotCount; i++) {
		let input = File.read("MCFC/" + tostring(i) + ".txt")
		if (input === null) {
			input = ","
		}
		const parts = input.split(",")
		names[i] = parts[0]
		codes[i] = parts[1]
	}
}

function refreshData() {
	if (GetLocalPlayer() == GetTriggerPlayer()) {
		for (let i = 0; i < slotCount; i++) {
			BlzFrameSetText(buttons[i], names[i])
		}
	}
	BlzFrameSetText(title, mode === Mode.load ? "Load Character" : "Save Character")
}

function toggleVisibility() {
	if (GetLocalPlayer() === GetTriggerPlayer()) {
		BlzFrameSetVisible(dialog, !BlzFrameIsVisible(dialog))
	}
}

export function initSaveLoad() {
	{
		let trigger = CreateTrigger();
		for (let i = 0; i < 10; i++) {
			TriggerRegisterPlayerChatEvent(trigger, Player(i), "-load", true);
		}

		TriggerAddAction(trigger, () => {
			mode = Mode.load
			refreshData()
			toggleVisibility()
		});
	}

	{
		let trigger = CreateTrigger();
		for (let i = 0; i < 10; i++) {
			TriggerRegisterPlayerChatEvent(trigger, Player(i), "-save", true);
		}

		TriggerAddAction(trigger, () => {
			mode = Mode.save
			refreshData()
			toggleVisibility()
		});
	}
}