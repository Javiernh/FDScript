// ==UserScript==
// @name     FDScript
// @include  http://mush.vg/fds*
// @include  http://mush.twinoid.com/fds*
// @require  https://code.jquery.com/jquery-2.2.1.min.js
// @version  1.3.8
// @grant    unsafeWindow
// @grant    GM_xmlhttpRequest
// @connect  mush.vg
// @connect  mush.twinoid.com
// @author   Ship-sorting, sanction-sorting and displayTreatment() by Lundi, all the rest by LAbare
// ==/UserScript==

/* TODO
 * Sleep.
 * Get a life.

 * DONE
 * Personal logs analysis:
   - Highlight: getting dirty, showers, becoming Mush, transfer (both sides), cured Mush, mutation, talkie pirating, taking skills (own skills, magebook and Apprentice), +some moral sources,
   - Mush/human + pirated status,
   - List of skills and the cycle they were chosen,
   - Character's name is not red anymore (too heavy).
 * General logs analysis:
   - Shrink sessions logs,
   - Destruction of rations by NERON,
   - Defaced rooms,
   - Hunter waves,
   - Mycoalarms ringing,
   - PILGRED repair,
   - Cycle and cause of death of heroes (fixed).
 * Map of a character's movements:
   - Separation by rooms,
   - Includes room logs and personal logs,
   - Shows who was already here,
   - Popup is draggable, resizeable and z-indexable.
   - New: More than one popup possible.
   - Fix: Dead characters supposedly no longer considered present (see below).
   - Fix: The script copy of the general logs tries putting death announcements back to their right place.
   - Fix: Corrupted data is reloaded (rare but easily detected).
 * All private channels window:
   - Char mugshots on joining/leaving,
   - Sort by character(s) (OR/AND toggle),
   - Cycles in italics for moar prettiness.
 * Fix by-ship reports sorting.
 * Separation of the different private channels (with mugshots), general announcements and missions.
 * Sanctions are sorted by categories, and by number of points inside categories, +suicide grouped with negativity.
 * Setting for auto height of logs.
 * Expedition links open in a new tab.
 * New: wall-reversing button for main and Mush channels.
 * Moderators: The script is not automatic, +button to hide Mush icons and pseudos to prevent spoiling if the mod is in a ship, AP count.
 * English translation.
 * Optimized! (a bit)
 * Easter egg!
 * Doesn't brew coffe (yet).
 * May become self-aware, handle with care.
 * May become suicidal if exposed to too many stupid reports in a short span.
 */


var console = unsafeWindow.console;
var localStorage = unsafeWindow.localStorage;

//Make your SVG dreams come true (credits: dascritch.net)
$.fn.extend({
	appendSVG: function (name, attributes) {
		var svg = document.createElementNS("http://www.w3.org/2000/svg", name);
		for (var key in attributes) {
			svg.setAttribute(key, attributes[key]);
		}
		var parents = this.length;
		for (var i = 0; i < parents; i++) {
			this[i].appendChild(svg);
		}
		return $(svg);
	}
}); 

var charRegexp = /Jin Su|Frieda|Kuan Ti|Janice|Roland|Hua|Paola|Chao|Finola|Stephen|Ian|Chun|Raluca|Gioele|Eleesha|Terrence|Derek|Andie/;
var generalLogs = {};
var currentLogs;
var currentChar;
var isMod = false;

var actions = {
	/* Use items/equipments */
	'PICK_OBJECT': 0, 'DROP_OBJECT': 0, 'SEEK_HIDDEN': 1, 'HIDE_OBJECT': 1, 'PICK_CAT': 0,
	'CONSULT_DOC': 0, 'WRITE_DOC': 0, 'TEAR': 0, 'INSPECT': 0,
	'INSTALL_EQ': 2, 'REMOVE_EQ': 1, 'DISASSEMBLE': 1, 'BUILD': 3, 'UPGRADE_DRONE': 2, 'GEN_METAL': 0, 'REINFORCE': 1,
	'REPAIR_HULL': 1, 'REPAIR_OBJECT': 1, 'REPAIR_PATROL_SHIP': 1, 'REPAIR_PILGRED': 2,
	'FILL_TANK': 0, 'REFILL_TANK': 0, 'FILL_OXY_TANK': 0, 'RETRIEVE_CAPSULE': 0, 'UNLOAD_OXY_TANK': 0, 'UNLOAD_TANK': 0, 'CHECK_LEVEL': 0,
	'SIGNAL_EQUIPMENT': 0, 'SIGNAL_FIRE': 0, 'USE_EXTINGUISHER': 1, 'EXTINGUISH': 1,

	/* Ships and navigation */
	'TURRET_ATTACK': 1, 'PATROL_SHIP_TAKEOFF': 2, 'PATROL_SHIP_ATTACK': 1, 'PATROL_SHIP_LAND': 2, 'PATROL_SHIP_EJECT': 1, 'PATROL_SHIP_PLANET_LAND': 4, 'PATROL_CHANGE_STANCE': 1,
	'PASIPHAE_RETRIEVE_CRAP': 2, 'PASIPHAE_RESCUE': 2, 'OPEN_CAPS': 1,
	'ICARUS_TAKEOFF': 4, 'RUN_HOME': 2,
	'CHANGE_SHIP_ORIENTATION': 1, 'ADVANCE_SHIP': 1, 'SET_PILGRED_TO_SOL': 2, 'SET_PILGRED_TO_EDEN': 2, 'COMPUTE_EDEN': 2, 'PUTSCH': 3,

	/* Aggressive actions */
	'SHOOT': 1, 'ATTACK': 1, 'AGGRO_ATTACK': 1, 'BITE': 0, 'TORTURE': 1, 'BRAWL': 1, 'THROW': 1,
	'GAG': 1, 'UNGAG': 1, 'PUT_THROUGH_DOOR': 2, 'GUARD': 1, 'CEASE_FIRE': 2,
	'PREMONITION': 1, 'DAUNT': 1, 'ANATHEM': 1,

	/* Health & morale */
	'HEAL': 2, 'SELF_HEAL': 3, 'VACCINE': 1, 'SURGERY': 2, 'SELF_SURGERY': 4, 'HEAL_ULTIMATE': 0, 'USE_BANDAGE': 1, 'EXTRACT_SPORE': 1,
	'KIND_WORDS': 1, 'FIERY_SPEECH': 2, 'CARESS': 1, 'FLIRT': 1, 'DO_THE_THING': 1, 'CHITCHAT': 1, 'PUBLIC_TV_BROADCAST': 2, 'REJOICE': 0, 'PLAY_ARCADE': 1,

	/* Personal actions */
	'LAY_DOWN': 0, 'WAKE_UP': 0, 'WASH_SELF': 1, 'TRY_KUBE': 1,
	'PRINT_ZE_LIST': 0, 'BECOME_GENIUS': 0, 'LEARN': 0, 'BORING_SPEECH': 2,

	/* Food & plants */
	'COOK_RATION': 1, 'EAT': 0, 'UNCOOK': 1, 'QUICK_COOK_RATION': 0, 'USE_DISPENSER': 0, 'RETRIEVE_COFFEE': 0, 'DEFROST': 1,
	'WATER_PLANTS': 1, 'TREAT_PLANTS': 2, 'NEW_PLANTS_SEEDING': 2, 'NEW_PLANTS_GRAFTING': 2,

	/* Working on terminals/equipments */
	'SCAN_FOR_PLANETS': 2, 'DEEP_PLANET_ANALYSIS': 2, 'REMOTE_PLANET_ANALYSIS': 2, 'DISMISS_SCAN': 0,
	'ACCESS': 0, 'ACCESS_SECONDARY': 0, 'HACK': 2,
	'RESEARCH': 2, 'DIG_PROJECT': 2,
	'ESTABLISH_COM': 2, 'DECODE_REBEL_SIGNAL': 2, 'CONTACT_XYLOPH': 2, 'NERON_UPDATE': 2, 'CLOSE_DEAL': 2,
	'DAILY_ORDER': 0, 'BROADCAST_MESSAGE': 0, 'COMMANDER_ORDER': 1,
	'CHECK_CREW_LIST': 0, 'CHECK_FOR_INFECTION': 0,

	/* Technical/beta/unimplemented actions */
	'SUICIDE': 0, 'AUTO_DESTROY': 0, 'INVOKE_MERCHANT': 0, 'DELETE_SHIP': 0,
	'REPAIR_TUTO_0': 1, 'REPAIR_TUTO_1': 1, 'SHOOT_TUTO_0': 1, 'SHOOT_TUTO_1': 1,
	'MOVE': 0, 'WHISPER': 0, 'USE_ITEM': 0,
	'CHECK_BATTERY': 0, 'CHECK_AMMO': 0, 'RELOAD_FLAMER': 0,

	/* Mush actions */
	'CREATE_SPORE': 3, 'GO_BERSERK': 3, 'EAT_SPORE': 0,
	'INFECT': 1, 'MASS_GGEDON': 2, 'SLIME_TRAP': 1, 'DEPRESS': 2, 'GIVE_NIGHTMARE': 0, 'EXCHANGE_BODY': 0, 'SCREW_TALKY': 3, 'GIVE_DISEASE': 2,
	'TRAP_CLOSET': 1, 'SPREAD_FIRE': 4, 'SABOTAGE': 1, 'DOOR_SABOTAGE': 0, 'MIX_RATION_SPORE': 0, 'MUSH_CARESS': 1, 'SLIME_OBJECT': 1, 'DELOG': 2, 'NERON_DEPRESS': 3
};

if (document.domain == 'mush.vg') {
	var rooms = ['Pont', 'Baie Alpha', 'Baie Beta', 'Baie Alpha 2', 'Nexus', 'Infirmerie', 'Laboratoire', 'Réfectoire', 'Jardin Hydroponique', 'Salle des moteurs', 'Tourelle Alpha avant', 'Tourelle Alpha centre', 'Tourelle Alpha arrière', 'Tourelle Beta avant', 'Tourelle Beta centre', 'Tourelle Beta arrière', 'Patrouilleur Longane', 'Patrouilleur Jujube', 'Patrouilleur Tamarin', 'Patrouilleur Socrate', 'Patrouilleur Epicure', 'Patrouilleur Planton', 'Patrouilleur Wallis', 'Pasiphae', 'Couloir avant', 'Couloir central', 'Couloir arrière', 'Planète', 'Baie Icarus', 'Dortoir Alpha', 'Dortoir Beta', 'Stockage Avant', 'Stockage Alpha centre', 'Stockage Alpha arrière', 'Stockage Beta centre', 'Stockage Beta arrière', 'Espace infini', 'Les Limbes'];

	var TXT = {
		//displayTreatment()
		checkVaccinated: "vacciné en %1",
		checkTransferred: "a transféré dans %1 en %2",
		checkIsMush: "depuis %1",
		checkStolen: "corps volé par %1 en %2",
		checkPirated: ", talkie piraté en %1",

		//charMovements()
		movementsAnalysisButton: "Analyse des déplacements",
		movementsTitle: "Déplacements de %1",
		presentChars: "Déjà présents : ",
		nobodyPresent: "personne.",
		charLogsTitle: "Logs personnels : ",
		roomLogsTitle: "Logs de la pièce : ",

		//generalAnalysis()
		generalAnalysisButton: "Analyse des logs généraux",
		noDeaths: "aucune.",
		noPILGRED: "non.",
		noWaves: "aucune.",
		noPerished: "jamais.",
		noDefaced: "aucune.",
		noAlarms: "aucune.",
		noPsyDiseases: "aucun.",
		psyDiseasesTitle: "<b>Logs de maladies psy :</b> ",
		wavesTitle: "<b>Vagues de hunters :</b> ",
		perishedTitle: "<b>Destruction des rations périmées :</b> ",
		defacedTitle: "<b>Pièces dialoguées :</b> ",
		alarmsTitle: "<b>Sonneries d'alarmes :</b> ",
		PILGREDTitle: "<b>PILGRED réparé :</b> ",
		deathsTitle: "<b>Morts :</b> ",
		deathsOxygen: "Asphyxie",
		deathsAll: "Tous les autres",
		deathsSol: "Retour sur Sol",
		deathsEden: "Voyage vers l'Éden",

		//evaluateSin()
		sinNothingReg: /Rien/,
		sinMushReg: /Mush/,
		sinGriefingReg: /Pourrissage|Suicide/,
		sinEncourageReg: /Incitation/,
		sinLanguageReg: /Langage/,
		sins: ["", "Mush", "Pourrissage", "Incitation", "Langage", "Autres"],

		//Misc.
		reportsNumber: " : %1 plainte(s) dans %2 vaisseau(x).",
		logsHeight: "Hauteur des fenêtres de logs : ",
		easterEgg: "Ô blas bougriot glabouilleux,<br />Tes micturations me touchent<br />Comme des flatouillis slictueux<br />Sur une blotte mouche.<br />Grubeux, je t'implore<br />Car mes fontins s'empalindroment…<br />Et surrénalement me sporent<br />De croinçantes épiquarômes.<br />Ou sinon… nous t'échierons dans les gobinapes :<br />Du fond de notre patafion,<br />Tu verras si j'en suis pas cap !",
		reverseWall: "Inverser le mur",
		mushDayCycleReg: /^\s*Jour [0-9]+ Cycle [0-9]+\s*$/,
		modsStart: "Lancer le script FDS",
		modsHideMush: "Cacher/révéler les Mushs",
		modsHidePseudos: "Cacher/révéler les pseudos",
		modsAPCount: "<em>(Mode modo)</em> <b>Énergie utilisée :</b> ~%1 PA",
		scriptVersion: "Version du FDScript : ",

		//Reports sorting
		shipSort: "Vue par vaisseau",
		altSort: "Vue globale triée",
		gamesSort: "Tri par nombre de parties",
		gamesSortDown: "Tri par nombre de parties (desc.)",
		gamesSortUp: "Tri par nombre de parties (asc.)",
		gamesNumberReg: /Nb de Partie : (\d*)/,

		//All private channels analysis
		allChannelsAnalysisButton: "Analyse des canaux",
		hideShowButton: "Tout cacher/montrer",
		channelsOr: "OU",
		channelsAnd: "ET",

		//Private channels analysis
		channelsAnalysisButton: "Découpage des canaux privés",
		joinedChannelReg: /a rejoint la discussion/,
		leftChannelReg: /a quitté la discussion/,
		channelTitle: "Canal n°",
		channelsAnalysisBug: "Un log manquant empêche le découpage correct des canaux privés. Désolé :/",

		//Personal logs analysis
		logsAnalysisButton: "Analyse des logs",
		skillsTitle: "<b>Compétences :</b> ",
		statusTitle: "<b>Statut :</b> ",
		noSkills: "aucune.",
	};
}
else {
	var rooms = ['Bridge', 'Alpha Bay', 'Bravo Bay', 'Alpha Bay 2', 'Nexus', 'Medlab', 'Laboratory', 'Refectory', 'Hydroponic Garden', 'Engine Room', 'Front Alpha Turret', 'Centre Alpha Turret', 'Rear Alpha Turret', 'Front Bravo Turret', 'Centre Bravo Turret', 'Rear Bravo Turret', 'Patrol Ship Tomorrowland', 'Patrol Ship Olive Grove', 'Patrol Ship Yasmin', 'Patrol Ship Wolf', 'Patrol Ship E-Street', 'Patrol Ship Eponine', 'Patrol Ship Carpe Diem', 'Pasiphae', 'Front Corridor', 'Central Corridor', 'Rear Corridor', 'Planet', 'Icarus Bay', 'Alpha Dorm', 'Bravo Dorm', 'Front Storage', 'Centre Alpha Storage', 'Rear Alpha Storage', 'Centre Bravo Storage', 'Rear Bravo Storage', 'Outer Space', 'Limbo'];

	var TXT = {
		//displayTreatment()
		checkVaccinated: "vaccinated in %1",
		checkTransferred: "transferred into %1 in %2",
		checkIsMush: "since %1",
		checkStolen: "body stolen by %1 in %2",
		checkPirated: ", talky pirated in %1",

		//charMovements()
		movementsAnalysisButton: "Movements analysis",
		movementsTitle: "%1's movements",
		presentChars: "Already there: ",
		nobodyPresent: "nobody.",
		charLogsTitle: "Personal logs: ",
		roomLogsTitle: "Room logs: ",

		//generalAnalysis()
		generalAnalysisButton: "General logs analysis",
		noDeaths: "none.",
		noPILGRED: "no.",
		noWaves: "none.",
		noPerished: "never.",
		noDefaced: "none.",
		noAlarms: "none.",
		noPsyDiseases: "none.",
		psyDiseasesTitle: "<b>Psy illnesses logs:</b> ",
		wavesTitle: "<b>Hunter waves:</b> ",
		perishedTitle: "<b>Perishable food destructions:</b> ",
		defacedTitle: "<b>Defaced rooms:</b> ",
		alarmsTitle: "<b>Mycoalarms ringing:</b> ",
		PILGREDTitle: "<b>PILGRED repaired:</b> ",
		deathsTitle: "<b>Deaths:</b> ",
		deathsOxygen: "Lack of oxygen",
		deathsAll: "All others",
		deathsSol: "Returned to Sol",
		deathsEden: "Travelled to Eden",

		//evaluateSin()
		sinNothingReg: /Rien/,
		sinMushReg: /Mush/,
		sinGriefingReg: /Negativity|Spoiling|Suicide/,
		sinEncourageReg: /Incitation/,
		sinLanguageReg: /Language|language|Langage/,
		sins: ["", "Mush", "Negativity", "Incitation", "Language", "Others"],

		//Misc.
		reportsNumber: " : %1 report(s) in %2 ship(s).",
		logsHeight: "Logs windows height: ",
		easterEgg: "Oh freddled gruntbuggly,<br />Thy micturations are to me<br />As plurdled gabbleblotchits on a lurgid bee.<br />Groop, I implore thee, my foonting turlingdromes<br />And hooptiously drangle me with crinkly bindlewurdles,<br />Or I will rend thee in the gobberwarts<br />With my blurglecruncheon, see if I don't!",
		reverseWall: "Reverse wall",
		mushDayCycleReg: /^\s*Day [0-9]+ Cycle [0-9]+\s*$/,
		modsStart: "Start SDF script",
		modsHideMush: "Hide/show Mushs",
		modsHidePseudos: "Hide/show pseudos",
		modsAPCount: "<em>(Mods only)</em> <b>Energy spent:</b> ~%1 AP",
		scriptVersion: "FDScript version: ",

		//Reports sorting
		shipSort: "Sort by ship",
		altSort: "One at a time",
		gamesSort: "Sort by number of games",
		gamesSortDown: "Sort by number of games (down)",
		gamesSortUp: "Sort by number of games (up)",
		gamesNumberReg: /Game number : (\d*)/,

		//All private channels analysis
		allChannelsAnalysisButton: "All channels analysis",
		hideShowButton: "Hide/show all",
		channelsOr: "OR",
		channelsAnd: "AND",

		//Private channels analysis
		channelsAnalysisButton: "Channels analysis",
		joinedChannelReg: /has joined discussion/,
		leftChannelReg: /cannot be reached here/,
		channelTitle: "Channel #",
		channelsAnalysisBug: "A missing leaving log prevents a correct analysis, aborted. Sorry :/",

		//Personal logs analysis
		logsAnalysisButton: "Logs analysis",
		statusTitle: "<b>Status:</b> ",
		skillsTitle: "<b>Skills:</b> ",
		noSkills: "none.",
	};
}


function addGlobalStyle(css) {
	$('<style>').attr('type', 'text/css').html(css).appendTo($('head'));
};

function loadXMLDoc(url, callback, params) { //params is an object
	GM_xmlhttpRequest({
		method: 'GET', url: url,
		onload: function(request) {
			callback(request, params);
		}
	});
};

function fetchGeneralLogs(id, callback) {
	loadXMLDoc('http://' + document.domain + id, function(request) {
		if (request.readyState == 4 && request.status == 200) {
			generalLogs[id] = $(request.responseText);
			//Put death announcements in the right place (when they're not caused by cycle change, they can be misplaced several cycles after)
			generalLogs[id].find('.cdShipLog span[onmouseover*="EV:NERON_HERO_DEATH"]').each(function() {
				var div = $(this).prev();
				var dateA = parseFloat(div.find('em').eq(0).text());
				var dateB = parseFloat(div.next().find('em').eq(0).text());
				if (dateA < dateB) { //If wrongly placed
					var char = charRegexp.exec(div.html())[0];
					div.insertBefore($('.cdShipLog span[onmouseover!="EV:NERON_HERO_DEATH"][onmouseover!="EV:CHAT"]:contains("' + char + '")').eq(0));
				}
			});
			console.log('fetched & processed general logs from ' + id);
			callback(request);
		}
	}, {});
};

function checkStatus(textLog) {
	var status;
	var wasPirated = [false];
	var vaccinated = /<em>(.*)<\/em>.*\[EV:LEAVED_MUSH\]/.exec(textLog);
	var transferred = /<em>(.*)<\/em>.*\{TRANSFERED TO (.*)\}/.exec(textLog);
	var isMush = /<em>(.*)<\/em>.*\[EV:PARASITED_PASSIVE_TRIUMPH_EARNED\]/.exec(textLog);
	var stolen = /<em>(.*)<\/em>.*\{WAS FORCED TO TRANSFER WITH (.*)\}/.exec(textLog);
	var pirated = /<em>(.*)<\/em>.*HAD HIS TALKY PIRATED/.exec(textLog)

	if (vaccinated) {
		status = ['vaccinated', vaccinated[1]];
	}
	else if (transferred) {
		status = ['transferred', transferred[1], transferred[2]];
	}
	else if (isMush) {
		status = ['mush', isMush[1]];
	}
	else if (stolen) {
		status = ['stolen', stolen[1], stolen[2]];
	}
	else {
		status = ['human'];
	}

	if (pirated) {
		wasPirated = [true, pirated[1]];
	}

	return [status, wasPirated];
};

function displayTreatment(request, params) {
	if (request.readyState == 4 && request.status == 200) {
		var textLog = request.responseText;
		var icoDiv = $('<div>').addClass('inlineBut').insertBefore('[data-id="' + params.id + '"] .cdDate');

		var status = checkStatus(textLog);

		switch (status[0][0]) {
			case 'vaccinated':
				var text = TXT.checkVaccinated.replace('%1', status[0][1]);
				$('<img>').attr('src', '/img/icons/ui/p_alive.png').css('margin-right', '3px').appendTo(icoDiv);
				$('<span>').text(text).appendTo(icoDiv);
				break;

			case 'transferred':
				var text = TXT.checkTransferred.replace('%1', status[0][2]).replace('%2', status[0][1]);
				$('<img>').attr('src', '/img/icons/ui/p_alive.png').css('margin-right', '3px').appendTo(icoDiv);
				$('<span>').text(text).appendTo(icoDiv);
				break;

			case 'mush':
				var text = TXT.checkIsMush.replace('%1', status[0][1]);
				$('<img>').attr('src', '/img/icons/ui/p_mush.png').css('margin-right', '3px').appendTo(icoDiv);
				$('<span>').text(text).appendTo(icoDiv);
				break;

			case 'stolen':
				var text = TXT.checkStolen.replace('%1', status[0][2]).replace('%2', status[0][1]);
				$('<img>').attr('src', '/img/icons/ui/p_mush.png').css('margin-right', '3px').appendTo(icoDiv);
				$('<span>').text(text).appendTo(icoDiv);
				break;

			case 'human':
			default:
				$('<img>').attr('src', '/img/icons/ui/p_alive.png').appendTo(icoDiv);
				break;
		}

		if (status[1][0]) {
			var text = TXT.checkPirated.replace('%1', status[1][1]);
			$('<span>').text(text).appendTo(icoDiv);
		}
	}
	$('[src*="/img/icons/ui/loading1.gif"]').remove();
}

function highlightActions(log) {
	if (!log.hasClass('FDScripted')) {
		log.addClass('FDScripted');
		var html = log.html();
		//Highlight dirtification (normal log, extract a spore, vomit on yourself, target of massgeddon)
		if (/EV:DIRTED|AC:CREATE_SPORE|EV:SYMPTOM_VOMIT|EV:AC_MASS_GGEDON_TGT/.test(html)) {
			log.find('span').css('color', '#EA3').append($('<img>').attr('src', '/img/icons/ui/status/dirty.png').css('margin-left', '5px'));
		}
		//Highlight showers
		else if (/AC:WASH_SELF/.test(html)) {
			log.find('span').css('color', '#7D3').append($('<img>').attr('src', '/img/icons/ui/status/germaphobic.png').css('margin-left', '5px'));
		}

		//Hightlight conversion, transfer (both sides), vaccination and mutation
		else if (/EV:PARASITED_PASSIVE_TRIUMPH_EARNED|EV:LEAVED_MUSH|\{TRANSFERED TO (.*)\}|\{WAS FORCED TO TRANSFER WITH (.*)\}|EV:HERO_MUTATED/.test(html)) {
			log.find('span').css('color', '#F3C');
		}

		//Highlight talkie pirating
		else if (/HAD HIS TALKY PIRATED|HAD PIRATED (.*) TALKY/.test(html)) {
			log.find('span').css('color', '#F3C').append($('<img>').attr('src', '/img/icons/ui/talkie.png').css('margin-left', '5px'));
		}

		//Highlight skills
		else if (/AC:LEARN|\{Skill chosen : (.*) as[a-z]*\}/.test(html)) {
			log.find('span').css('color', '#F13').append($('<img>').attr('src', '/img/icons/ui/learned.png').css('margin-left', '5px'));
		}

		//Highlight some moral sources: caressing the cat, doing The Thing, chatting with Andie
		else if (/AC:CARESS|AC:DO_THE_THING|AC:CHITCHAT/.test(html)) {
			log.find('span').css('color', '#FD0').append($('<img>').attr('src', '/img/icons/ui/moral.png').css('margin-left', '5px'));
		}
	}
	return log;
}

function charMovements(allCharLogs, thisChar, thisLogs) {
	var logs = $(generalLogs[thisLogs].find('> div > div > div').get().reverse()); //We only need the logs, from start to end
	allCharLogs = $(allCharLogs.get().reverse());
	var allCharLogsLength = allCharLogs.length;

	//Numerous variables T_T
	var charIndex = 0;
	var logsIndex = -1
	var sortedLogs = []; //Array of objects { room: "", charLogs: [], roomLogs: [], beforeLogs: [] }, result of the tracking process
	var lastEntry = {};
	var movements = []; //Array of all rooms the char went through
	var positions = { 'Jin Su': null, Frieda: null, 'Kuan Ti': null, Janice: null, Roland: null, Hua: null, Paola: null, Chao: null, Finola: null, Stephen: null, Ian: null, Chun: null, Raluca: null, Gioele: null, Eleesha: null, Terrence: null, Derek: null, Andie: null };

	var continueTracking = true;
	logs.each(function() {
		//De-strong character name
		var html = $(this).html().replace('&amp;eacute;', 'é');

		//Detect deaths (if current char, the log has no room, so check it before room test)
		if (/EV:NERON_HERO_DEATH|EV:OXY_LOW_DAMMIT/.test(html)) { //Oxygen deaths are somehow different…
			var char = charRegexp.exec(html)[0];
			if (char == thisChar) {
				sortedLogs[logsIndex].roomLogs.push($(this).clone()); //Push death log
				return false; //End tracking
			}
			else {
				positions[char] = null;
				return true; //jQuery.each(): non-false return = continue
			}
		}

		//Room detection; if no room is assigned to the log, it can't be used
		var room = /\[ROOM:([^\]]+)\]/.exec(html);
		if (room) {
			room = room[1];
		}
		else {
			return true;
		}
		$(this).html($(this).html().replace('<strong>' + thisChar + '</strong>', thisChar));

		//Detect movements
		if (/EV:NEW_CREW_MEMBER|EV:CHARACTER_ENTERED/.test(html)) {
			var char = charRegexp.exec(html)[0];
			positions[char] = room;
			//Update last entry
			if (char != thisChar) {
				lastEntry[char] = { char: char, date: /[0-9]+\.[0-9]+/.exec(html)[0] };
			}

			//Entry of current character
			if (char == thisChar) {
				if (/EV:CHARACTER_ENTERED/.test(html)) {
					sortedLogs[logsIndex].roomLogs.push($(this).prev().clone()); //Exit log, which is not in the right order (and somehow it's prev, not next)
				}
				logsIndex += 1;
				//New room = new object
				sortedLogs.push({ room: room, charLogs: [], roomLogs: [], beforeLogs: [] });
				movements.push('<em>' + /[0-9]+\.[0-9]+/.exec(html)[0] + '</em> ' + room);

				//People who entered the room before
				for (key in lastEntry) {
					if (positions[key] == positions[thisChar]) {
						sortedLogs[logsIndex].beforeLogs.push(lastEntry[key]);
					}
				}

				//Corrupted data: erase and retry
				if (/\[ROOM:([^\]]+)\]/.exec(allCharLogs.eq(charIndex).html())[1].replace('&amp;eacute;', 'é') != room) {
					generalLogs[thisLogs] = null;
					fetchGeneralLogs(thisLogs, function() {
						charMovements(allCharLogs, thisChar, thisLogs);
					});
					continueTracking = false;
					return false;
				}

				//Add all char logs of this room
				sortedLogs[logsIndex].charLogs.push(allCharLogs.eq(charIndex).clone()); //Entry log
				charIndex += 1;
				while (!/EV:CHARACTER_ENTERED/.test(allCharLogs.eq(charIndex).html())) {
					var charLog = allCharLogs.eq(charIndex);
					charLog.html(charLog.html().replace('<strong>' + thisChar + '</strong>', thisChar));
					sortedLogs[logsIndex].charLogs.push(charLog.clone());
					charIndex += 1;
					if (charIndex == allCharLogsLength) {
						break;
					}
				}
			}
		}

		//Room logs
		if (room == positions[thisChar]) {
			sortedLogs[logsIndex].roomLogs.push($(this).clone());
		}
	});
	if (!continueTracking) { //If data was corrupted
		return false;
	}

	//Result popup
	var popup = $('<div>').addClass('FDScript-popup').css({
		position: 'absolute', top: (window.scrollY + 50) + 'px', left: Math.round((window.innerWidth - 800) / 2) + 'px', zIndex: '1500',
		boxSizing: 'border-box', width: '800px', padding: '10px 10px',
		resize: 'both', overflow: 'auto',
		boxShadow: '#000 5px 5px 10px',
		border: '2px #000440 solid', borderRadius: '5px',
		backgroundColor: '#338'
	}).appendTo($('body'));
	$('<img>').css({ position: 'absolute', bottom: 0, right: 0 }).attr({
		src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAANCAYAAABy6+R8AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AIVEy040d+6twAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAXklEQVQoz2NgoCXQbvgiodP05z8DAwMDE7EaGJk4nv//90OSgYGBgZEUDVcbeF4Q1IRNA17noWsg6CdsGvD6CZ8GrH4iRgOK8whpwPATMRqQ/cTEwMDAgOFmAnyyAADp4pEx3U4jiAAAAABJRU5ErkJggg=='
	}).appendTo(popup);
	var zIndex = 1000;
	$('.ui-dialog').filter(':visible').each(function() {
		var z = parseInt($(this).css('z-index'));
		if (zIndex < z) {
			zIndex = z;
		}
	});
	popup.css('z-index', zIndex + 1);

	//Title
	var titleDiv = $('<div>').css({ cursor: 'move', fontSize: '0.9em', textAlign: 'center' }).appendTo(popup);
	$('<button>').text("↓").addClass('butbg').css('float', 'left').appendTo(titleDiv).on('click', function() {
		$(this).closest('.FDScript-popup').css('z-index', '-=1');
	});
	$('<button>').text("↑").addClass('butbg').css('float', 'left').appendTo(titleDiv).on('click', function() {
		$(this).closest('.FDScript-popup').css('z-index', '+=1');
	});
	var title = $('<h2>').text(TXT.movementsTitle.replace('%1', thisChar)).css('user-select', 'none').appendTo(titleDiv);
	$('<button>').text("X").addClass('butbg').css({ position: 'absolute', top: '5px', right: '5px' }).appendTo(titleDiv).on('click', function() {
		$(this).closest('.FDScript-popup').remove();
	});

	//Draggable popup
	var evX = null;
	var evY = null;
	var moving = false;
	var target = null;
	title.on('mousedown', function() {
		moving = true;
		var zIndex = 1000;
		$('.ui-dialog').filter(':visible').each(function() {
			var z = parseInt($(this).css('z-index'));
			if (zIndex < z) {
				zIndex = z;
			}
		});
		target = $(this).closest('.FDScript-popup');
		target.css('z-index', zIndex + 1);
    });
	$('body').on('mouseup', function() {
		moving = false;
		evX = null;
		evY = null;
		target = null;
    }).on('mousemove', function(event) {
		if (moving) {
			if (evX == null) {
				evX = event.pageX;
				evY = event.pageY;
			}
			else {
				var relX = event.pageX - evX;
				var relY = event.pageY - evY;
				var offset = target.offset();
				evX = event.pageX;
				evY = event.pageY;
				target.offset({ left: offset.left + relX, top: offset.top + relY });
			}
		}
	});

	//Basic structure
	var tr = $('<tr>').appendTo($('<table>').appendTo(popup));
	var left = $('<td>').css('vertical-align', 'top').appendTo(tr);
	var right = $('<td>').css({ verticalAlign: 'top', paddingLeft: '10px', width: '100%' }).appendTo(tr);

	//Generating the map
	var svgRooms = [['m5.5 64.5 10 0 0 -10 30 0 0 50 -30 0 0 -10 -10 0 0 -30z'], [60, 30, 115.5, 4.5], [60, 30, 115.5, 124.5], [60, 30, 175.5, 4.5], [20, 30, 155.5, 64.5], [30, 40, 85.5, 84.5], [30, 40, 55.5, 84.5], [30, 50, 125.5, 54.5], [30, 40, 55.5, 34.5], [45, 90, 215.5, 34.5], [20, 20, 25.5, 34.5], [20, 20, 95.5, 14.5], [20, 20, 235.5, 14.5], [20, 20, 25.5, 104.5], [20, 20, 95.5, 124.5], [20, 20, 235.5, 124.5], [10, 10, 120.5, 9.5], [10, 10, 140.5, 9.5], [10, 10, 160.5, 9.5], [10, 10, 120.5, 139.5], [10, 10, 140.5, 139.5], [10, 10, 160.5, 139.5], [10, 10, 200.5, 9.5], [10, 10, 220.5, 9.5], ['m45.5 34.5 10 0 0 40 60 0 0 10 -60 0 0 40 -10 0 0 -90z'], [10, 90, 115.5, 34.5], [10, 110, 175.5, 34.5], [], [50, 30, 185.5, 124.5], ['m145.5 34.5 30 0 0 30 -20 0 0 -10 -10 0 0 -20z'], ['m145.5 124.5 30 0 0 -30 -20 0 0 10 -10 0 0 20z'], [30, 40, 85.5, 34.5], [20, 20, 125.5, 34.5], [30, 20, 185.5, 34.5], [20, 20, 125.5, 104.5], [30, 20, 185.5, 104.5]];
	var svgDoors = [[30.5, 54.5, 10, 0], [30.5, 104.5, 10, 0], [45.5, 74.5, 0, 10], [175.5, 19.5, 0, 10], [115.5, 19.5, 0, 10], [115.5, 34.5, 10, 0], [150.5, 34.5, 10, 0], [130.5, 34.5, 10, 0], [115.5, 129.5, 0, 10], [115.5, 124.5, 10, 0], [175.5, 129.5, 0, 10], [150.5, 124.5, 10, 0], [130.5, 124.5, 10, 0], [220.5, 34.5, 10, 0], [235.5, 19.5, 0, 10], [175.5, 34.5, 10, 0], [175.5, 74.5, 0, 10], [85.5, 89.5, 0, 10], [100.5, 124.5, 10, 0], [90.5, 84.5, 10, 0], [70.5, 84.5, 10, 0], [125.5, 74.5, 0, 10], [70.5, 74.5, 10, 0], [85.5, 59.5, 0, 10], [240.5, 34.5, 10, 0], [240.5, 124.5, 10, 0], [220.5, 124.5, 10, 0], [215.5, 39.5, 0, 10], [215.5, 109.5, 0, 10], [45.5, 39.5, 0, 10], [100.5, 34.5, 10, 0], [45.5, 109.5, 0, 10], [235.5, 129.5, 0, 10], [115.5, 74.5, 0, 10], [90.5, 74.5, 10, 0], [185.5, 129.5, 0, 10], [175.5, 39.5, 0, 10], [175.5, 109.5, 0, 10], [185.5, 39.5, 0, 10], [185.5, 109.5, 0, 10]];
	var svg = left.appendSVG('svg', { width: '265', height: '160' });

	//SVG rooms
	for (var i = 0; i < svgRooms.length; i++) {
		var r = svgRooms[i];
		if (!r.length) {
			continue;
		}

		if (r.length == 1) { //Non-rectangular room
			svg.appendSVG('path', { d: r[0], 'data-maproom': i });
		}
		else { //Rectangular room
			svg.appendSVG('rect', { width: r[0], height: r[1], x: r[2], y: r[3], 'data-maproom': i });
		}
	}
	$('[data-maproom="6"]').addClass('FDScript-mapselected');
	//SVG doors
	for (var i = 0; i < svgDoors.length; i++) {
		var d = svgDoors[i];
		svg.appendSVG('path', { d: 'm' + d.join(' '), class: 'door' });
	}

	//Rooms
	var pathDiv = $('<div>').css({ maxHeight: '380px', marginTop: '15px', overflowY: 'auto', position: 'relative', fontSize: '0.9em' }).appendTo(left); //'relative' for position() & scroll
	for (var i = 0; i < movements.length; i++) {
		$('<div>').addClass('FDScript-room').css('cursor', 'pointer').html(movements[i]).attr('data-index', i).appendTo(pathDiv).on('click', function() {
			popup.find('.FDScript-roomselected').removeClass('FDScript-roomselected');
			$(this).addClass('FDScript-roomselected');

			var index = parseInt($(this).attr('data-index'));
			popup.find('.FDScript-logsPack').hide();
			var newPack = popup.find('.FDScript-logsPack[data-index="' + index + '"]');
			newPack.show();

			//topDiv
			popup.find('.FDScript-titleRoom').html(movements[index]);
			popup.find('.FDScript-prevRoom').css('visibility', 'visible');
			popup.find('.FDScript-nextRoom').css('visibility', 'visible');
			if (!newPack.prev().length) { //First room
				popup.find('.FDScript-prevRoom').css('visibility', 'hidden');
			}
			if (!newPack.next().length) { //Last room
				popup.find('.FDScript-nextRoom').css('visibility', 'hidden');
			}

			//Map
			popup.find('.FDScript-mapselected').removeClass('FDScript-mapselected');
			popup.find('[data-maproom="' + rooms.indexOf(newPack.attr('data-room')) + '"]').addClass('FDScript-mapselected');
		});
	}
	popup.find('.FDScript-room[data-index="0"]').addClass('FDScript-roomselected');

	//Navigation
	var topDiv = $('<div>').css('text-align', 'center').appendTo(right);
	$('<button>').addClass('butbg inlineBut').text("←").addClass('FDScript-prevRoom').css('visibility', 'hidden').appendTo(topDiv).on('click', function() {
		//Previous logs pack
		var currPack = popup.find('.FDScript-logsPack:visible');
		var newPack = currPack.prev();
		currPack.hide();
		newPack.show();

		//Rooms
		popup.find('.FDScript-roomselected').removeClass('FDScript-roomselected');
		popup.find('.FDScript-room[data-index="' + newPack.attr('data-index') + '"]').addClass('FDScript-roomselected');
		popup.find('.FDScript-roomselected').parent().scrollTop(0); //Reset
		var scroll = popup.find('.FDScript-roomselected').position().top - 200;
		if (scroll < 0) {
			scroll = 0;
		}
		popup.find('.FDScript-roomselected').parent().scrollTop(scroll);

		//topDiv
		if (!newPack.prev().length) { //First room
			$(this).css('visibility', 'hidden');
		}
		popup.find('.FDScript-nextRoom').css('visibility', 'visible');
		popup.find('.FDScript-titleRoom').html(movements[parseInt(newPack.attr('data-index'))]);

		//Map
		popup.find('.FDScript-mapselected').removeClass('FDScript-mapselected');
		popup.find('[data-maproom="' + rooms.indexOf(newPack.attr('data-room')) + '"]').addClass('FDScript-mapselected');
	});
	$('<span>').html(movements[0]).css({ width: '250px', display: 'inline-block' }).addClass('FDScript-titleRoom').appendTo(topDiv);
	$('<button>').addClass('butbg inlineBut').text("→").addClass('FDScript-nextRoom').appendTo(topDiv).on('click', function() {
		//Next logs pack
		var currPack = popup.find('.FDScript-logsPack:visible');
		var newPack = currPack.next();
		currPack.hide();
		newPack.show();

		//Rooms
		popup.find('.FDScript-roomselected').removeClass('FDScript-roomselected');
		popup.find('.FDScript-room[data-index="' + newPack.attr('data-index') + '"]').addClass('FDScript-roomselected');
		popup.find('.FDScript-roomselected').parent().scrollTop(0); //Reset
		var scroll = popup.find('.FDScript-roomselected').position().top - 200;
		if (scroll < 0) {
			scroll = 0;
		}
		popup.find('.FDScript-roomselected').parent().scrollTop(scroll);

		//topDiv
		if (!newPack.next().length) { //Last room
			$(this).css('visibility', 'hidden');
		}
		popup.find('.FDScript-prevRoom').css('visibility', 'visible');
		popup.find('.FDScript-titleRoom').html(movements[parseInt(newPack.attr('data-index'))]);

		//Map
		popup.find('.FDScript-mapselected').removeClass('FDScript-mapselected');
		popup.find('[data-maproom="' + rooms.indexOf(newPack.attr('data-room')) + '"]').addClass('FDScript-mapselected');
	});
	//Inactive in lab = no next movement
	if (movements.length == 1) {
		popup.find('.FDScript-nextRoom').css('visibility', 'hidden');
	}

	//Logs packs
	var packsDiv = $('<div>').appendTo(right);
	for (var i = 0; i < sortedLogs.length; i++) {
		var pack = $('<div>').addClass('FDScript-logsPack').attr({
			'data-index': i,
			'data-room': sortedLogs[i].room
		}).css({
			overflowY: 'auto',
			fontSize: '0.8em'
		}).appendTo(packsDiv);
		if (i != 0) { //Hide all but the first
			pack.hide();
		}

		//People already in the room
		var befDiv = $('<div>').text(TXT.presentChars).css('margin-top', '10px').appendTo(pack);
		for (var j = 0; j < sortedLogs[i].beforeLogs.length; j++) {
			$('<img>').attr({
				src: '/img/design/pixel.gif',
				title: sortedLogs[i].beforeLogs[j].char
			}).css({
				background: 'url("/img/art/char.png")',
				width: '25px', height: '16px', overflow: 'hidden',
				marginLeft: '6px'
			}).addClass('char ' + sortedLogs[i].beforeLogs[j].char.toLowerCase().replace(' ', '_')).appendTo(befDiv);
			befDiv.append(sortedLogs[i].beforeLogs[j].date);
		}
		if (sortedLogs[i].beforeLogs.length == 0) {
			befDiv.append(TXT.nobodyPresent);
		}

		//Char logs
		$('<h3>').text(TXT.charLogsTitle).css('margin-top', '10px').appendTo(pack);
		var charDiv = $('<div>').css({ overflowY: 'auto', backgroundColor: '#17448E' }).appendTo(pack);
		for (var j = 0; j < sortedLogs[i].charLogs.length; j++) {
			var log = sortedLogs[i].charLogs[j];
			log = highlightActions(log);
			log.prependTo(charDiv);
		}

		//Room logs
		var roomLogsTitle = $('<h3>').text(TXT.roomLogsTitle).css('margin-top', '10px').appendTo(pack);
		$('<a>').text("+-").appendTo(roomLogsTitle).css({
			color: 'white', fontSize: '1.2em', textDecoration: 'underline', cursor: 'pointer'
		}).on('click', function() { $(this).parent().next().slideToggle(); return false; });
		var roomDiv = $('<div>').css({ overflowY: 'auto', backgroundColor: '#17448E' }).hide().appendTo(pack);
		for (var j = 0; j < sortedLogs[i].roomLogs.length; j++) {
			var log = sortedLogs[i].roomLogs[j];
			log = highlightActions(log);
			log.prependTo(roomDiv);
		}
	}

	//Expedition links in new tab
	popup.find('a[href]').attr('target', '_blank');
}

function generalAnalysis(shipDiv, id) {
	var defaced = [];
	var perished = [];
	var waves = [];
	var alarms = [];
	var shrink = {};
	var PILGRED = TXT.noPILGRED;
	var deaths = [];

	generalLogs[id].find('> div > div > div').each(function() {
		var html = $(this).html().replace('&amp;eacute;', 'é');
		var text = $(this).text();
		if (/EV:HUNTER_WAVE_INC/.test(html)) {
			waves.push(/[0-9]+\.[0-9]+/.exec(html)[0]);
		}
		else if (/EV:RATION_PERISHED/.test(html)) {
			var date = /[0-9]+\.[0-9]+/.exec(html)[0];
			if (perished.indexOf(date) == -1) { //Avoid repetitions
				perished.push(date);
			}
		}
		else if (/EV:EVENT/.test(html) && /D+R+I+N+G+/.test(html)) {
			alarms.push([/[0-9]+\.[0-9]+/.exec(html)[0], /\[ROOM:([^\]]+)\]/.exec(html)[1]]); //[date, room]
		}
		else if (/AC:DELOG/.test(html)) {
			defaced.push([/[0-9]+\.[0-9]+/.exec(html)[0], /\[ROOM:([^\]]+)\]/.exec(html)[1]]); //[date, room]
		}
		else if (/EV:PILGRED_DONE/.test(html)) {
			PILGRED = /[0-9]+\.[0-9]+/.exec(html)[0] + ".";
		}
		else if (/EV:PSY_SESSION/.test(html)) {
			var date = /[0-9]+\.[0-9]+/.exec(html)[0];
			var charEx = /Jin Su|Frieda|Kuan Ti|Janice|Roland|Hua|Paola|Chao|Finola|Stephen|Ian|Chun|Raluca|Gioele|Eleesha|Terrence|Derek|Andie/g;
			var charA = charEx.exec(text)[0];
			var charB = charEx.exec(text)[0]; //A second call to exec() gets the next char

			//Determine which char is being cured
			if (/EV:PSY_SESSION_SUCCESS/.test(html)) {
				var char = charA; //"X has been cured, Y is satisfied"
			}
			else {
				var char = charB; //"Y is satisfied, X is being cured"
			}

			if (!shrink.hasOwnProperty(char)) {
				shrink[char] = [];
			}
			shrink[char].push(date);
		}
		else if (/EV:NERON_HERO_DEATH/.test(html)) {
			deaths.push([/[0-9]+\.[0-9]+/.exec(html)[0], charRegexp.exec(text)[0], /[«\(](.*)[»\)]/.exec(text)[1].trim()]); //Cycle, hero, death
		}
		else if (/EV:OXY_LOW_DAMMIT/.test(html)) {
			deaths.push([/[0-9]+\.[0-9]+/.exec(html)[0], charRegexp.exec(text)[0], TXT.deathsOxygen]); //Cycle, hero, death
		}
		else if (/SET_PILGRED_TO_SOL/.test(html)) {
			deaths.push([/[0-9]+\.[0-9]+/.exec(html)[0], TXT.deathsAll, TXT.deathsSol]); //Cycle, hero, death
		}
		else if (/SET_PILGRED_TO_EDEN/.test(html)) {
			deaths.push([/[0-9]+\.[0-9]+/.exec(html)[0], TXT.deathsAll, TXT.deathsEden]); //Cycle, hero, death
		}
	});

	//Result
	waves = ((waves.length) ? waves.reverse().join(", ") + " (" + waves.length + ")." : TXT.noWaves);
	perished = ((perished.length) ? perished.reverse().join(", ") + "." : TXT.noPerished);

	if (defaced.length) {
		for (var i = 0; i < defaced.length; i++) {
			defaced[i] = defaced[i][1] + " (" + defaced[i][0] + ")";
		}
		defaced = defaced.reverse().join(", ") + ".";
	}
	else {
		defaced = TXT.noDefaced;
	}

	if (alarms.length) {
		for (var i = 0; i < alarms.length; i++) {
			alarms[i] = alarms[i][1] + " (" + alarms[i][0] + ")";
		}
		alarms = alarms.reverse().join(", ") + ".";
	}
	else {
		alarms = TXT.noAlarms;
	}

	var psyDiseases = [];
	if (Object.keys(shrink).length) {
		for (char in shrink) {
			var charDiseases = char + " (" + shrink[char].reverse().join(", ") + ")";
			psyDiseases.push(charDiseases);
		}
		psyDiseases = psyDiseases.join(", ") + ".";
	}
	else {
		psyDiseases = TXT.noPsyDiseases;
	}

	$('<div>').html(TXT.psyDiseasesTitle + psyDiseases).appendTo(shipDiv);
	$('<div>').html(TXT.wavesTitle + waves).appendTo(shipDiv);
	$('<div>').html(TXT.perishedTitle + perished).appendTo(shipDiv);
	$('<div>').html(TXT.defacedTitle + defaced).appendTo(shipDiv);
	$('<div>').html(TXT.alarmsTitle + alarms).appendTo(shipDiv);
	$('<div>').html(TXT.PILGREDTitle + PILGRED).appendTo(shipDiv);

	var deathsDiv = $('<div>').html(TXT.deathsTitle).appendTo(shipDiv);
	if (!deaths.length) {
		deathsDiv.append(TXT.noDeaths);
	}
	else {
		var deathsUl = $('<ul>').appendTo(deathsDiv);
		deaths = deaths.reverse();
		for (var i = 0; i < deaths.length; i++) {
			$('<li>').css('display', 'list-item').html('<em>' + deaths[i][0] + '</em> ' + deaths[i][1] + ' (' + deaths[i][2] + ')').appendTo(deathsUl);
		}
	}
}

function evaluateSin(qualif) {
	var result;
	if (TXT.sinNothingReg.test(qualif)) {
		result = 0;
	}
	else if (TXT.sinMushReg.test(qualif)) {
		result = 1;
	}
	else if (TXT.sinGriefingReg.test(qualif)) {
		result = 2;
	}
	else if (TXT.sinEncourageReg.test(qualif)) {
		result = 3;
	}
	else if (TXT.sinLanguageReg.test(qualif)) {
		result = 4;
	}
	else {
		result = 5;
	}
	return result;
}

function addMembersToLog(members, log) {
	for (var i = 0; i < members.length; i++) {
		$('<img>').attr({
			src: '/img/design/pixel.gif',
			title: members[i]
		}).css({
			background: 'url("/img/art/char.png")',
			width: '20px', height: '16px', overflow: 'hidden',
		}).addClass('char ' + members[i].toLowerCase().replace(' ', '_')).appendTo(log);
	}
}

function start() {
	console.log('FDScript: starting');
	var currentShip = -1;
	var ships = [];
	var currShip = 0;
	var reports = 0;

	//Scan through all reports
	$(".fds_control_bloc:not(.FDScripted)").each(function() {
		reports += 1;
		var block = $(this);
		block.addClass('FDScripted');
		var histoLink = '';

		//Get plaintee histoLink
		var plainteeDiv = block.find('.inl-blck').eq(1);
		block.find('.cdProof .fds_char_pack').each(function() {
			if ($(this).find('.fdsName').text() == plainteeDiv.find('.fdsName').text()) {
				histoLink = $(this).find('a').attr('href');
			}
		});

		//Interpret HTML tags and character codes in reports
		block.find('.cdReason li').each(function() {
			$(this).html($(this).text());
		});

		//Sort judging options
		var select = block.find('.judge_bloc select');
		var sanctions = [[], [], [], [], [], []]; //Categories
		select.find('option').each(function() {
			sanctions[evaluateSin($(this).text())].push([$(this).text().trim(), $(this).attr('data-id')]); //Name and data-id
			$(this).remove();
		});
		for (var i = 0; i < sanctions.length; i++) {
			if (i > 0) { //Sanctions
				//Sort by number of points
				sanctions[i].sort(function(a, b) {
					var aPoints = parseInt(/[0-9]+/.exec(a[0])[0]);
					var bPoints = parseInt(/[0-9]+/.exec(b[0])[0]);
					if (aPoints > bPoints) {
						return 1;
					}
					if (aPoints < bPoints) {
						return -1;
					}
					return 0;
				});
				var parent = $('<optgroup>').attr('label', TXT.sins[i]).appendTo(select);
			}
			else { //"Nothing"
				var parent = select;
			}
			for (var j = 0; j < sanctions[i].length; j++) {
				$('<option>').text(sanctions[i][j][0]).attr('data-id', sanctions[i][j][1]).appendTo(parent);
			}
		}

		//Check if Mush or human
		$('<input>').attr({
			type: 'button', value: 'Check', 'data-histolink': histoLink, 'data-block-id': block.attr('data-id')
		}).addClass('butbg').on('click', function() {
			$(this).prepend($('<img>').attr('src', '/img/icons/ui/loading1.gif'));
			loadXMLDoc($(this).attr('data-histolink'), displayTreatment, { id: $(this).attr('data-block-id') });
			$(this).prop('disabled', true);
		}).appendTo(plainteeDiv);

		//Sort reports by ship
		var id = /[0-9]+/.exec(block.find('a[href*="shipStory"]').attr('href'))[0];
		block.parent().addClass('allships shipNum' + id);
		if (ships.indexOf(id) == -1) {
			ships.push(id);
		}

		//Separator
		$('<div>').addClass('divSep').hide().appendTo(block.parent());
	});
	console.log('FDScript: found ' + reports + ' reports in ' + ships.length + ' ships');

	//Add a couple classes for selection optimization
	$('[href*="mushLog"]').attr("onclick", "Main.ajaxPopup($(this).attr('href'), { width: '600px', dialogClass: 'mushWall' }); return false;");
	$('[href*="s/story"]').attr("onclick", "Main.ajaxPopup($(this).attr('href'), { width: '600px', dialogClass: 'playerLogs' }); return false;");

	//Display number of reports and ships
	var reportsNumber = TXT.reportsNumber.replace('%1', reports).replace('%2', ships.length);
	$('.fds_bloc').eq(2).find('h2').append(reportsNumber);

	//Navigation buttons (initially hidden)
	var buttonsDiv = $('<div>').hide().prependTo($('.fds_big_judge'));

	//Logs height parameter
	var logsHeight = localStorage['FDScript-logsHeight'];
	if (logsHeight == undefined) {
		logsHeight = 270;
	}
	var paramsDiv = $('<div>').insertBefore(buttonsDiv);
	$('<label>').attr('for', 'FDScript-logsHeight').text(TXT.logsHeight).appendTo(paramsDiv);
	$('<input>').attr({
		type: 'number', min: 10, value: logsHeight, name: 'FDScript-logsHeight'
	}).css({
		color: 'black', width: '5em'
	}).appendTo(paramsDiv).on('change', function() {
		var logsHeight = $(this).val();
		$('style').filter(':contains("logsHeight")').remove();
		addGlobalStyle(".cdUserlogs > div, .cdPrivateChannels > div, .cdMissions, .cdAnnounces, .FDScript-logsPack div { max-height: " + logsHeight + "px !important; } /*logsHeight*/");
		localStorage['FDScript-logsHeight'] = logsHeight;
		if (logsHeight == '42') {
			$('#FDScript-easterEgg').show();
		}
		else {
			$('#FDScript-easterEgg').hide();
		}
	});
	paramsDiv.append("px");
	$('<div>').html(TXT.easterEgg).attr('id', 'FDScript-easterEgg').hide().appendTo($('.readmore'));
	
	/* Some vars are declared to be used later, keep them */
	//Ship-by-ship controls
	var viewDiv = $('<div>').insertBefore(buttonsDiv);
	var viewCheck = $('<input>').attr({ type: 'checkbox', id: 'viewBox' }).appendTo(viewDiv);
	$('<label>').text(TXT.shipSort).appendTo(viewDiv);

	//One-by-one controls
	var altDiv = $('<div>').insertBefore(buttonsDiv);
	var altCheck = $('<input>').attr({ type: 'checkbox', id: 'altBox' }).appendTo(altDiv);
	$('<label>').text(TXT.altSort).appendTo(altDiv);

	//Sort by game number
	var sortDiv = $('<div>').insertBefore(buttonsDiv);
	var sortCheck = $('<input>').attr({ type: 'checkbox', id: 'sortBox' }).appendTo(sortDiv);
	var labSortCheck = $('<label>').text(TXT.gamesSort).appendTo(sortDiv);
	
	//Previous and next ship buttons
	$('<button>').text('←').addClass('butbg inlineBut').on('click', function() {
		if (currShip > 0) {
			$('.shipNum' + ships[currShip]).hide();
			//Switch to previous ship
			currShip -= 1;
			$('.shipNum' + ships[currShip]).show();
		}
	}).appendTo(buttonsDiv); //Previous
	$('<button>').text('→').addClass('butbg inlineBut').on('click', function() {
		if (currShip < ships.length - 1) {
			$('.shipNum' + ships[currShip]).hide();
			//Switch to next ship
			currShip += 1;
			$('.shipNum' + ships[currShip]).show();
		}
	}).appendTo(buttonsDiv); //Next

	//View checkbox function
	viewCheck.on('change', function() {
		if (this.checked) {
			//Hide all ships but the first
			currShip = 0;
			$('.allships').hide();
			$('.shipNum' + ships[0]).show();

			//Show buttons
			buttonsDiv.show();

			//De-check other inputs
			if (altCheck.is(':checked')) {
				altCheck.click();
			}
			if (sortCheck.is(':checked')) {
				sortCheck.click();
				$(this).click();
			}
			labSortCheck.text(TXT.gamesSort);
		}
		else {
			$('.allships').show();
			buttonsDiv.hide();
		}
	});

	//Alt checkbox function
	altCheck.on('change', function() {
		if (this.checked) {
			$('.divSep').show();
			//De-check other inputs
			if (viewCheck.is(':checked')) {
				viewCheck.click();
			}
		}
		else {
			$('.divSep').hide();
		}
	});
	
	//Sort checkbox function
	sortCheck.on('change', function() {
		if (this.checked) {
			var greater = 1;
			var lesser = -1; 
			var sortText = TXT.gamesSortUp;
		}
		else {
			var greater = -1;
			var lesser = 1;
			var sortText = TXT.gamesSortDown;
		}

		var reports = $("li.allships");
		var mainUl = $("ul.fds_big_judge");
		//Sort all reports
		reports.sort(function(a, b) {
			var pattGames = TXT.gamesNumberReg;
			var aGames = parseInt(pattGames.exec($(a).text())[1]);
			var bGames = parseInt(pattGames.exec($(b).text())[1]);
			if (aGames > bGames) {
				return greater;
			}
			if (aGames < bGames) {
				return lesser;
			}
			return 0;
		});
		reports.detach().appendTo(mainUl);
		labSortCheck.text(sortText);

		//De-check other inputs
		if (viewCheck.is(':checked')) {
			viewCheck.click();
		}
		if (altCheck.is(':checked')) {
			altCheck.click();
		}
	});

	//Get ID for each ship and add ship logs analysis
	$('.cdProof').each(function() {
		var shipId = $(this).find('[href*="shipStory"]').attr('href');
		$(this).find('a').attr('data-ship-id', shipId).on('click', function() {
			currentLogs = $(this).attr('data-ship-id');
			currentChar = $(this).closest('.fds_char_pack').find('.fdsName').text().replace('_', ' ').replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); }); //Capitalize
		});

		//Ship logs analysis
		var shipDiv = $('<div>').css({ margin: '5px 0', padding: '5px 0', borderBottom: '2px dotted red' }).prependTo($(this));
		$('<button>').text(TXT.generalAnalysisButton).addClass('butbg inlineBut').css('font-size', '0.9em !important').attr('data-ship-id', shipId).prependTo($(this)).on('click', function() {
			$(this).prop('disabled', true);
			var id = $(this).attr('data-ship-id');

			//Load logs
			if (!generalLogs.hasOwnProperty(id)) {
				$(this).prepend($('<img>').attr('src', '/img/icons/ui/loading1.gif'));
				fetchGeneralLogs(id, function() {
					generalAnalysis(shipDiv, id);
					$('[src*="/img/icons/ui/loading1.gif"]').remove();
				});
			}
			else {
				generalAnalysis(shipDiv, id);
			}
		});
	});

	//Player logs analysis
	setInterval(function() {
		//Reverse wall (eventually)
		var wall = $('.cdWalls:not(.FDScripted)').filter(':visible');
		if (wall.length) {
			wall.addClass('FDScripted');
			$('<button>').text(TXT.reverseWall).addClass('butbg inlineBut').appendTo(wall.closest('.ui-dialog').find('.ui-dialog-titlebar')).on('click', function() {
				var title = wall.find('h3');
				wall.find('.cdWall').each(function() {
					$(this).insertAfter(title);
				});
			});
		}

		//Expedition links in new tab
		$('[href*="expPerma"]').attr('target', '_blank');

		//Delete closed windows for optimization
		$('.ui-dialog').filter(':hidden').remove();

		//Scrollable mush channel + divide cycles + reverse wall button
		var mush = $('.mushWall:not(.FDScripted) .cdDialog').filter(':visible');
		if (mush.length) {
			mush.parent().addClass('FDScripted');
			mush.children('li').each(function() {
				//Cycle separation
				if (TXT.mushDayCycleReg.test($(this).text())) {
					$(this).addClass('mushChannelCycle');
					$(this).css({
						margin: '5px 0', padding: '5px 0', borderBottom: '2px dotted red',
						textAlign: 'center', fontWeight: 'bold'
					});
				}
			});
			$('<button>').text(TXT.reverseWall).addClass('butbg inlineBut').appendTo(mush.closest('.ui-dialog').find('.ui-dialog-titlebar')).on('click', function() {
				mush.children('li').each(function() {
					$(this).prependTo(mush);
					//Swap top-bottom cycle borders
					if ($(this).hasClass('mushChannelCycle')) {
						if ($(this).css('border-bottom-width') != '0px') { //If border is on bottom
							$(this).css({ borderBottom: 'none', borderTop: '2px dotted red' });
						}
						else {
							$(this).css({ borderBottom: '2px dotted red', borderTop: 'none' });
						}
					}
				});
			});
		}

		//All private channels
		var allChannels = $('.cdChannels:not(.FDScripted)').filter(':visible');
		if (allChannels.length) {
			allChannels.addClass('FDScripted');
			var titlebar = allChannels.closest('.ui-dialog').find('.ui-dialog-titlebar');
			var chans = allChannels.find('.cdChan');
			$('<button>').addClass('butbg inlineBut').text(TXT.allChannelsAnalysisButton).appendTo(titlebar).on('click', function() {
				$(this).remove();
				titlebar.addClass('FDScript-titlebar');
				titlebar.find('.ui-dialog-title').remove();

				//Channel members analysis
				var allMembers = [];
				chans.each(function() {
					var chanMembers = [];
					var members = [];
					$(this).find('li').each(function() {
						//Logs processing
						if (!$(this).find('.fdsName').length) { //Don't process messages, only logs
							$(this).contents().eq(0).each(function() { //Day.Cycle in italics
								$(this).replaceWith( $('<em>').text($(this).text().trim()).css('margin-right', '3px') );
							});
							var text = $(this).text();
							if (TXT.joinedChannelReg.test(text)) {
								var name = charRegexp.exec(text)[0];
								if (members.indexOf(name) == -1) {
									members.push(name);
									addMembersToLog(members, $(this));
								}
								if (chanMembers.indexOf(name) == -1) {
									chanMembers.push(name);
									$(this).closest('.cdChan').addClass('FDScript-' + name.toLowerCase().replace(' ', '_'));
								}
								if (allMembers.indexOf(name) == -1) {
									allMembers.push(name);
								}
							}
							else if (TXT.leftChannelReg.test(text)) {
								members.splice(members.indexOf(charRegexp.exec(text)[0]), 1);
								addMembersToLog(members, $(this));
							}
						}
						//Day.Cycle next to char and in italics
						else {
							$(this).children('div').css('display', 'inline');
							$(this).contents().eq(2).each(function() {
								$(this).replaceWith( $('<em>').text($(this).text().trim()).css('margin-left', '10px') );
							});
						}
					});
				});

				//Channel selection by char
				function showCharChannels() {
					chans.hide();
					switch ($('[name="FDScript-charSel"]:visible:checked').val()) {
						case 'and':
							var chars = [];
							$('.FDScript-channelChar:not(.off)').filter(':visible').each(function() {
								chars.push('FDScript-' + $(this).attr('data-name'));
							});
							$('.cdChan.' + chars.join('.')).show();
							break;
						case 'or':
						default:
							$('.FDScript-channelChar:not(.off)').filter(':visible').each(function() {
								$('.cdChan.FDScript-' + $(this).attr('data-name')).show();
							});
							break;
					}
				}
				$('<button>').addClass('butbg inlineBut').text(TXT.hideShowButton).css({
					cssText: 'font-size: 8pt !important', marginRight: '10px'
				}).appendTo(titlebar).on('click', function() {
					if ($('.FDScript-channelChar:not(.off)').filter(':visible').length) { //Hide all
						$('.FDScript-channelChar').addClass('off');
						chans.hide();
					}
					else { //Show all
						$('.FDScript-channelChar').removeClass('off');
						showCharChannels();
					}
				});
				for (var i = 0; i < allMembers.length; i++) {
					var name = allMembers[i].toLowerCase().replace(' ', '_');
					$('<img>').attr({
						src: '/img/design/pixel.gif',
						title: allMembers[i],
						'data-name': name
					}).css({
						background: 'url("/img/art/char.png")',
						width: '20px', height: '16px', overflow: 'hidden',
						cursor: 'pointer'
					}).addClass('FDScript-channelChar char ' + name).appendTo(titlebar).on('click', function() {
						$(this).toggleClass('off');
						showCharChannels();
					});
				}
				var form = $('<form>').css({ marginLeft: '10px', display: 'inline-block', fontSize: '10pt' }).appendTo(titlebar);
				var divOr = $('<div>').appendTo(form);
				$('<input>').attr({ type: 'radio', name: 'FDScript-charSel', value: 'or', checked: true }).on('click', showCharChannels).appendTo(divOr);
				divOr.append(TXT.channelsOr);
				var divAnd = $('<div>').appendTo(form);
				$('<input>').attr({ type: 'radio', name: 'FDScript-charSel', value: 'and' }).on('click', showCharChannels).appendTo(divAnd);
				divAnd.append(TXT.channelsAnd);
			});
		}

		//Personal logs
		var logs = $('.playerLogs:not(.FDScripted)').filter(':visible');
		if (logs.length) {
			logs.addClass('FDScripted');
			$('[onclick*="slideDown"]').attr('onclick', '$(this).parent().next().slideToggle(); return false;'); //Bugfix
			var topDiv = $('<div>').insertBefore(logs.find('.fdsStory'));

			//Character logs analysis
			$('<button>').text(TXT.logsAnalysisButton).addClass('butbg inlineBut').appendTo(topDiv).on('click', function() {
				$(this).prop('disabled', true);
				var skills = [];
				var AP = 0;

				//Log by log analysis
				logs.find('.cdUserlogs div div').each(function() {
					//De-strong character name
					$(this).html($(this).html().replace('<strong>' + currentChar + '</strong>', currentChar));

					//Highlight actions
					highlightActions($(this));

					//Skills
					if (/\{Skill chosen : (.*)\}/.test($(this).text())) {
						var skill = /([0-9]+\.[0-9]+)(?:.+)\{Skill chosen : (.*) as[a-z]*\}/.exec($(this).text());
						skills.push(skill[2] + " (" + skill[1] + ")");
					}

					//Mods: AP count
					if (isMod) {
						var tip = $(this).find('span').eq(0).attr('onmouseover');
						if (/AC:/.test(tip)) {
							AP += actions[/\[AC:([^\]]+)\]/.exec(tip)[1]];
						}
					}
				});

				//Mush/human & pirated status
				var status = checkStatus(logs.find('.cdUserlogs').html());
				var statusDiv = $('<div>').html(TXT.statusTitle).css('font-size', '0.9em').appendTo(topDiv);

				switch (status[0][0]) {
					case 'vaccinated':
						var text = TXT.checkVaccinated.replace('%1', status[0][1]);
						$('<img>').attr('src', '/img/icons/ui/p_alive.png').css('margin-right', '3px').appendTo(statusDiv);
						$('<span>').text(text).appendTo(statusDiv);
						break;

					case 'transferred':
						var text = TXT.checkTransferred.replace('%1', status[0][2]).replace('%2', status[0][1]);
						$('<img>').attr('src', '/img/icons/ui/p_alive.png').css('margin-right', '3px').appendTo(statusDiv);
						$('<span>').text(text).appendTo(statusDiv);
						break;

					case 'mush':
						var text = TXT.checkIsMush.replace('%1', status[0][1]);
						$('<img>').attr('src', '/img/icons/ui/p_mush.png').css('margin-right', '3px').appendTo(statusDiv);
						$('<span>').text(text).appendTo(statusDiv);
						break;

					case 'stolen':
						var text = TXT.checkStolen.replace('%1', status[0][2]).replace('%2', status[0][1]);
						$('<img>').attr('src', '/img/icons/ui/p_mush.png').css('margin-right', '3px').appendTo(statusDiv);
						$('<span>').text(text).appendTo(statusDiv);
						break;

					case 'human':
					default:
						$('<img>').attr('src', '/img/icons/ui/p_alive.png').appendTo(statusDiv);
						break;
				}

				if (status[1][0]) {
					var text = TXT.checkPirated.replace('%1', status[1][1]);
					$('<span>').text(text).appendTo(statusDiv);
				}

				//Skills result
				skills = ((skills.length) ? skills.reverse().join(", ") : TXT.noSkills);
				$('<div>').html(TXT.skillsTitle + skills).css('font-size', '0.9em').appendTo(topDiv);

				//Mods: AP count result
				if (isMod) {
					$('<div>').html(TXT.modsAPCount.replace('%1', AP)).css('font-size', '0.9em').appendTo(topDiv);
				}
			});

			//Player map
			var thisChar = currentChar;
			var thisLogs = currentLogs;
			$('<button>').text(TXT.movementsAnalysisButton).addClass('butbg inlineBut').css('margin-left', '10px').appendTo(topDiv).on('click', function() {
				//Load ship logs
				var allCharLogs = logs.find('.cdUserlogs div div').clone();
				if (!generalLogs.hasOwnProperty(thisLogs)) {
					$(this).prepend($('<img>').attr('src', '/img/icons/ui/loading1.gif'));
					fetchGeneralLogs(thisLogs, function() {
						charMovements(allCharLogs, thisChar, thisLogs);
						$('[src*="/img/icons/ui/loading1.gif"]').remove();
					});
				}
				else {
					charMovements(allCharLogs, thisChar, thisLogs);
				}
			});

			//Divide private channels
			var privates = logs.find('.cdPrivateChannels');
			if (privates.length) {
				$('<button>').text(TXT.channelsAnalysisButton).addClass('butbg inlineBut').css('margin-left', '10px').appendTo(topDiv).on('click', function() {
					var bugged = false;
					var number = 0;
					var members = [];
					var index = 0;
					var channels = [[]];

					privates.find('> div > div').each(function() {
						if (!$(this).find('.fdsName').length) { //Don't process messages, only logs
							var text = $(this).text();
							if (TXT.joinedChannelReg.test(text)) {
								if (members.indexOf(charRegexp.exec(text)[0]) != -1) { //In case a log is missing, a character may be present twice, breaking all the division process
									bugged = true;
									return false;
								}
								number += 1;
								members.push(charRegexp.exec(text)[0]);
								addMembersToLog(members, $(this));
							}
							else if (TXT.leftChannelReg.test(text)) {
								number -= 1;
								members.splice(members.indexOf(charRegexp.exec(text)[0]), 1);
								addMembersToLog(members, $(this));
							}
						}
						channels[index].push($(this));
						if (!number) {
							channels.push([]);
							index += 1;
						}
					});
					if (!bugged) {
						//Create a div for each channel
						for (var i = 0; i < channels.length; i++) {
							if (!channels[i].length) { //Last "channel" (empty)
								continue;
							}
							var channel = $('<div>').css({ padding: '5px 0', margin: '5px 0', borderBottom: '2px dotted red' }).appendTo(privates.find('> div'));
							$('<h3>').text(TXT.channelTitle + (i + 1)).appendTo(channel);
							for (var j = 0; j < channels[i].length; j++) {
								channels[i][j].appendTo(channel);
							}
						}
					}
					else {
						alert(TXT.channelsAnalysisBug);
					}
				});
			}
		}
	}, 250);
}


//CSS in <head>
var logsHeight = localStorage['FDScript-logsHeight'];
if (logsHeight == undefined) {
	logsHeight = 270;
}
console.log('FDScript: localStorage["FDScript-logsHeight"]: ' + localStorage['FDScript-logsHeight']);
addGlobalStyle(".cdUserlogs > div, .cdPrivateChannels > div, .cdWalls, .cdShipLog, .cdChannels, .cdMissions, .cdAnnounces { overflow: auto !important; position: relative !important; }");
addGlobalStyle(".cdUserlogs > div, .cdPrivateChannels > div, .cdMissions, .cdAnnounces, .FDScript-logsPack div { max-height: " + logsHeight + "px !important; } /* logsHeight */");
addGlobalStyle(".cdWalls, .cdShipLog, .cdChannels, .mushWall .cdDialog { height: 500px !important; }");
addGlobalStyle(".cdChannels { font-size: 0.9em; }");
addGlobalStyle(".cdChan:not(:last-of-type), .cdMissions ul:not(:last-of-type), .cdAnnounces ul:not(:last-of-type) { margin: 5px 0; padding: 5px 0; border-bottom: 2px dotted red; }");
addGlobalStyle(".inlineBut { display: inline-block; font-size: 10pt !important; }");
addGlobalStyle(".divSep { display: block; border-top-style: dotted; border-top-color: red; width: 700px; }");
addGlobalStyle("svg * { fill: #FFF; stroke: #000; }");
addGlobalStyle("svg path.door { stroke: #11F; stroke-width: 2; }");
addGlobalStyle(".FDScript-mapselected { fill: #FF0 !important; }");
addGlobalStyle(".FDScript-roomselected { background-color: #83B; }");
addGlobalStyle(".FDScript-room:hover { background-color: #94C; }");
addGlobalStyle(".FDScript-popup strong { color: #F13; }");
addGlobalStyle(".FDScript-channelChar.off { opacity: 0.4; }");
addGlobalStyle(".FDScript-titlebar { padding: 1em 1em 0 0; }");
addGlobalStyle(".FDScript-titlebar > * { vertical-align: middle; }");


if ($('.pol2.fds_bloc').length) { //Moderators
	isMod = true;
	$('<button>').text(TXT.modsHideMush).addClass('butbg inlineBut').insertBefore($('.cdRecTgtComplaint')).on('click', function() {
		var noMushCss = $('#FDScript-noMush');
		if (noMushCss.length) {
			noMushCss.remove();
		}
		else {
			$('<style>').attr({ type: 'text/css', id: 'FDScript-noMush' }).html('.fds_char_pack .mush_ico { display: none; }').appendTo($('head'));
		}
	});
	$('<button>').text(TXT.modsHidePseudos).addClass('butbg inlineBut').insertBefore($('.cdRecTgtComplaint')).on('click', function() {
		var noPseudosCss = $('#FDScript-noPseudos');
		if (noPseudosCss.length) {
			noPseudosCss.remove();
		}
		else {
			$('<style>').attr({ type: 'text/css', id: 'FDScript-noPseudos' }).html('.tid_user { display: none; }').appendTo($('head'));
		}
	});
	$('<button>').text(TXT.modsStart).addClass('butbg inlineBut').insertBefore($('.cdRecTgtComplaint')).on('click', function() {
		start();
	});
}
else { //Judges
	start();
}

$('<div>').text(TXT.scriptVersion + GM_info.script.version).css('font-size', '10pt').appendTo($('body'));
