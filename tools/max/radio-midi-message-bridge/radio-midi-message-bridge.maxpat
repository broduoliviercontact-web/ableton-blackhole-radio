{
	"patcher" : 	{
		"fileversion" : "1.2",
		"appversion" : 		{
			"major" : 8,
			"minor" : 6,
			"revision" : 5,
			"architecture" : "x64",
			"modernui" : 1
		},
		"classnamespace" : "box",
		"rect" : [ 59.0, 107.0, 720.0, 600.0 ],
		"bglocked" : 0,
		"openinpresentation" : 0,
		"default_fontname" : "Arial",
		"default_fontsize" : 12.0,
		"default_fontface" : 0,
		"default_fontname" : "Arial",
		"gridonopen" : 1,
		"gridsize" : [ 15.0, 15.0 ],
		"gridsnaponopen" : 1,
		"objects" : 		[
			{
				"box" : 				{
					"id" : "obj-1",
					"maxclass" : "comment",
					"text" : "RADIO MIDI MESSAGE BRIDGE",
					"fontsize" : 18.0,
					"fontface" : 1,
					"numinlets" : 0,
					"numoutlets" : 0,
					"patching_rect" : [ 30.0, 30.0, 460.0, 28.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-2",
					"maxclass" : "comment",
					"text" : "1) CONFIG -- cliquer UN message 'config <url> <password>' ci-dessous :",
					"numinlets" : 0,
					"numoutlets" : 0,
					"patching_rect" : [ 30.0, 75.0, 460.0, 18.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-3",
					"maxclass" : "message",
					"text" : "config http://localhost:3001 YOUR_PASSWORD_HERE",
					"numinlets" : 2,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 30.0, 98.0, 420.0, 22.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-4",
					"maxclass" : "message",
					"text" : "config https://ableton-blackhole-radio.onrender.com YOUR_PASSWORD_HERE",
					"numinlets" : 2,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 30.0, 124.0, 470.0, 22.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-5",
					"maxclass" : "comment",
					"text" : "Indicateur config (recoit le status du node.script) :",
					"numinlets" : 0,
					"numoutlets" : 0,
					"patching_rect" : [ 30.0, 155.0, 420.0, 18.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-6",
					"maxclass" : "message",
					"text" : "(cliquez un config ci-dessus)",
					"numinlets" : 2,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 30.0, 178.0, 360.0, 22.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-7",
					"maxclass" : "comment",
					"text" : "2) MIDI DECODER -- clear (reset anti-dup/buffer) / test (local, sans Ableton) :",
					"numinlets" : 0,
					"numoutlets" : 0,
					"patching_rect" : [ 30.0, 220.0, 480.0, 18.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-8",
					"maxclass" : "message",
					"text" : "clear",
					"numinlets" : 2,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 30.0, 243.0, 70.0, 22.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-9",
					"maxclass" : "message",
					"text" : "test",
					"numinlets" : 2,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 110.0, 243.0, 70.0, 22.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-10",
					"maxclass" : "comment",
					"text" : "Entree MIDI -- flux piste Ableton (MIDI Effect) :",
					"numinlets" : 0,
					"numoutlets" : 0,
					"patching_rect" : [ 30.0, 285.0, 420.0, 18.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-11",
					"maxclass" : "newobj",
					"text" : "midiin",
					"numinlets" : 0,
					"numoutlets" : 1,
					"outlettype" : [ "int" ],
					"patching_rect" : [ 30.0, 308.0, 70.0, 22.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-12",
					"maxclass" : "newobj",
					"text" : "midiparse",
					"numinlets" : 1,
					"numoutlets" : 6,
					"outlettype" : [ "list", "list", "int", "int", "int", "int" ],
					"patching_rect" : [ 30.0, 338.0, 100.0, 22.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-13",
					"maxclass" : "comment",
					"text" : "Entree MIDI -- standalone (port MIDI / clavier virtuel) :",
					"numinlets" : 0,
					"numoutlets" : 0,
					"patching_rect" : [ 330.0, 285.0, 300.0, 18.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-14",
					"maxclass" : "newobj",
					"text" : "notein",
					"numinlets" : 0,
					"numoutlets" : 3,
					"outlettype" : [ "int", "int", "int" ],
					"patching_rect" : [ 330.0, 308.0, 70.0, 22.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-15",
					"maxclass" : "newobj",
					"text" : "pak i i i",
					"numinlets" : 3,
					"numoutlets" : 1,
					"outlettype" : [ "list" ],
					"patching_rect" : [ 330.0, 338.0, 90.0, 22.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-16",
					"maxclass" : "newobj",
					"text" : "js radio_midi_bridge.js",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "", "" ],
					"patching_rect" : [ 30.0, 380.0, 220.0, 22.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-17",
					"maxclass" : "newobj",
					"text" : "prepend post",
					"numinlets" : 2,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 30.0, 413.0, 110.0, 22.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-18",
					"maxclass" : "newobj",
					"text" : "node.script radio_midi_poster.js",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 30.0, 445.0, 250.0, 22.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-19",
					"maxclass" : "newobj",
					"text" : "print radio-midi-bridge",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 300.0, 380.0, 160.0, 22.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-20",
					"maxclass" : "newobj",
					"text" : "print radio-midi-poster",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 300.0, 445.0, 160.0, 22.0 ]
				}
			}
,			{
				"box" : 				{
					"id" : "obj-21",
					"maxclass" : "comment",
					"text" : "3) LOG = console Max (menu Window -> Max Console). Pas de midiout => les notes data ne sortent pas (aucun son). Le device decode et POST uniquement.",
					"linecount" : 2,
					"numinlets" : 0,
					"numoutlets" : 0,
					"patching_rect" : [ 30.0, 490.0, 640.0, 34.0 ]
				}
			}
		],
		"lines" : 		[
			{
				"patchline" : 				{
					"source" : [ "obj-3", 0 ],
					"destination" : [ "obj-18", 0 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
,			{
				"patchline" : 				{
					"source" : [ "obj-4", 0 ],
					"destination" : [ "obj-18", 0 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
,			{
				"patchline" : 				{
					"source" : [ "obj-8", 0 ],
					"destination" : [ "obj-16", 0 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
,			{
				"patchline" : 				{
					"source" : [ "obj-9", 0 ],
					"destination" : [ "obj-16", 0 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
,			{
				"patchline" : 				{
					"source" : [ "obj-11", 0 ],
					"destination" : [ "obj-12", 0 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
,			{
				"patchline" : 				{
					"source" : [ "obj-12", 0 ],
					"destination" : [ "obj-16", 0 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
,			{
				"patchline" : 				{
					"source" : [ "obj-14", 0 ],
					"destination" : [ "obj-15", 0 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
,			{
				"patchline" : 				{
					"source" : [ "obj-14", 1 ],
					"destination" : [ "obj-15", 1 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
,			{
				"patchline" : 				{
					"source" : [ "obj-14", 2 ],
					"destination" : [ "obj-15", 2 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
,			{
				"patchline" : 				{
					"source" : [ "obj-15", 0 ],
					"destination" : [ "obj-16", 0 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
,			{
				"patchline" : 				{
					"source" : [ "obj-16", 0 ],
					"destination" : [ "obj-17", 0 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
,			{
				"patchline" : 				{
					"source" : [ "obj-16", 1 ],
					"destination" : [ "obj-19", 0 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
,			{
				"patchline" : 				{
					"source" : [ "obj-17", 0 ],
					"destination" : [ "obj-18", 0 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
,			{
				"patchline" : 				{
					"source" : [ "obj-18", 0 ],
					"destination" : [ "obj-20", 0 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
,			{
				"patchline" : 				{
					"source" : [ "obj-18", 0 ],
					"destination" : [ "obj-6", 0 ],
					"hidden" : 0,
					"disabled" : 0
				}
			}
		],
		"dependency_cache" : 		[
			{
				"name" : "radio_midi_bridge.js",
				"bootpath" : "./",
				"type" : "script",
				"implicit" : 1
			}
,			{
				"name" : "radio_midi_poster.js",
				"bootpath" : "./",
				"type" : "script",
				"implicit" : 1
			}
		],
		"autosave" : 0
	}
}