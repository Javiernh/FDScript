// ==UserScript==
// @name     FDScript
// @include  http://mush.vg/fds*
// @require  http://code.jquery.com/jquery-latest.js
// @version  1.2.10
// @grant    unsafeWindow
// @grant    GM_xmlhttpRequest
// @author   Lundi, LAbare
// ==/UserScript==

/* TODO
 * sleep
 * get a life

 * DONE
 * HL salissures, se laver
 * HL: transfert, victime transfert, vaccin
 * compétences et cycle de prise
 * pas auto pour modos
 * analyse logs généraux : destruction des denrées, salles dialoguées, vagues de hunters, PILGRED
 * map déplacements et qui était dans la pièce à ce moment-là (par log d'entrée)
 * retri des sanction intra-catégorie
 * log perso dans fenêtre de base : pas rouge
 * liens expé _blank
 * popup déplacements draggable, resizable & z-indexable
 * taille des fenêtres de log (paramétrable)
 * séparer canaux privés, annonces, missions
 * easter egg
 */


var console = unsafeWindow.console;

//Make your SVG dreams come true (credit: dascritch.net)
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

var generalLogs = {};
var currentLogs;
var currentChar = '';
var rooms = ['Pont', 'Baie Alpha', 'Baie Beta', 'Baie Alpha 2', 'Nexus', 'Infirmerie', 'Laboratoire', 'Réfectoire', 'Jardin Hydroponique', 'Salle des moteurs', 'Tourelle Alpha avant', 'Tourelle Alpha centre', 'Tourelle Alpha arrière', 'Tourelle Beta avant', 'Tourelle Beta centre', 'Tourelle Beta arrière', 'Patrouilleur Longane', 'Patrouilleur Jujube', 'Patrouilleur Tamarin', 'Patrouilleur Socrate', 'Patrouilleur Epicure', 'Patrouilleur Planton', 'Patrouilleur Wallis', 'Pasiphae', 'Couloir avant', 'Couloir central', 'Couloir arrière', 'Planète', 'Baie Icarus', 'Dortoir Alpha', 'Dortoir Beta', 'Stockage Avant', 'Stockage Alpha centre', 'Stockage Alpha arrière', 'Stockage Beta centre', 'Stockage Beta arrière', 'Espace infini', 'Les Limbes'];


function addGlobalStyle(css) {
	$('<style>').attr('type', 'text/css').html(css).appendTo($('head'));
}

function loadXMLDoc(url, callback, params) { //params is an array
	GM_xmlhttpRequest({
		method: 'GET', url: url,
		onload: function(response) {
			callback(response, params);
		}
	});
}

function displayTreatment(request, params) {
	var id = params[0];
	if (request.readyState == 4 && request.status == 200) {
		var textLog = request.responseText;
		var icoDiv = $('<div>').addClass('checkDiv').insertBefore('[data-id="' + id + '"] .cdDate');

		vaccinated = /<em>(.*)<\/em>.*\[EV:LEAVED_MUSH\]/.exec(textLog);
		transferred = /<em>(.*)<\/em>.*\{TRANSFERED TO (.*)\}/.exec(textLog);
		isMush = /<em>(.*)<\/em>.*\[EV:PARASITED_PASSIVE_TRIUMPH_EARNED\]/.exec(textLog);
		stolen = /<em>(.*)<\/em>.*\{WAS FORCED TO TRANSFER WITH (.*)\}/.exec(textLog);

		if (vaccinated) {
			$('<img>').attr('src', '/img/icons/ui/pa_heal.png').css('margin-right', '3px').appendTo(icoDiv);
			$('<span>').text("en " + vaccinated[1]).appendTo(icoDiv);
		}
		else if (transferred) {
			$('<img>').attr('src', '/img/icons/ui/pageright.png').css('margin-right', '3px').appendTo(icoDiv);
			$('<span>').text("a transféré dans " + transferred[2] + " en " + transferred[1]).appendTo(icoDiv);
		}
		else if (isMush) {
			$('<img>').attr('src', '/img/icons/ui/mush.png').css('margin-right', '3px').appendTo(icoDiv);
			$('<span>').text("depuis " + isMush[1]).appendTo(icoDiv);
		}
		else if (stolen) {
			$('<img>').attr('src', '/img/icons/ui/mush.png').css('margin-right', '3px').appendTo(icoDiv);
			$('<span>').text("corps volé par " + stolen[2] + " en " + stolen[1]).appendTo(icoDiv);
		}
		else {
			$('<img>').attr('src', '/img/icons/ui/p_alive.png').appendTo(icoDiv);
		}
	}
}

function highlightActions(log) {
	if (!log.hasClass('scripted')) {
		log.addClass('scripted');
		var html = log.html();
		//Highlight dirtification (normal log, extract a spore, vomit on yourself, target of massgeddon)
		if (/\[EV:DIRTED\]|\[AC:CREATE_SPORE\]|\[EV:SYMPTOM_VOMIT\]|\[EV:AC_MASS_GGEDON_TGT\]/.test(html)) {
			log.find('span').css('color', '#EA3').append($('<img>').attr('src', '/img/icons/ui/status/dirty.png').css('margin-left', '5px'));
		}
		//Highlight showers
		else if (/\[AC:WASH_SELF\]/.test(html)) {
			log.find('span').css('color', '#7D3').append($('<img>').attr('src', '/img/icons/ui/status/germaphobic.png').css('margin-left', '5px'));
		}

		//Hightlight transfer (both sides), vaccination and mutation
		else if (/\[EV:LEAVED_MUSH\]|{TRANSFERED TO (.*)\}|{WAS FORCED TO TRANSFER WITH (.*)\}|\[EV:HERO_MUTATED\]/.test(html)) {
			log.find('span').css('color', '#F3C');
		}

		//Highlight talkie pirate
		else if (/HAD HIS TALKY PIRATED|HAD PIRATED (.*) TALKY/.test(html)) {
			log.find('span').css('color', '#F3C').append($('<img>').attr('src', '/img/icons/ui/talkie.png').css('margin-left', '5px'));
		}
	}
	return log;
}

function charMovements(allCharLogs) {
	var logs = $($(generalLogs[currentLogs]).find('> div > div > div').get().reverse()); //We only need the logs, from start to end
	allCharLogs = $(allCharLogs.get().reverse());
	var allCharLogsLength = allCharLogs.length;
	var logsLength = logs.length;

	//Numerous variables
	var recordRoom = true;
	var charIndex = 0;
	var logsIndex = -1
	var sortedLogs = [];
	var lastEntry = [];
	var movements = [];
	var positions = { 'Jin Su': null, Frieda: null, 'Kuan Ti': null, Janice: null, Roland: null, Hua: null, Paola: null, Chao: null, Finola: null, Stephen: null, Ian: null, Chun: null, Raluca: null, Gioele: null, Eleesha: null, Terrence: null, Derek: null, Andie: null };
	var charRegexp = /Jin Su|Frieda|Kuan Ti|Janice|Roland|Hua|Paola|Chao|Finola|Stephen|Ian|Chun|Raluca|Gioele|Eleesha|Terrence|Derek|Andie/;

	logs.each(function() {
		//De-strong character name
		$(this).html($(this).html().replace('<strong>' + currentChar + '</strong>', currentChar));
		var html = $(this).html().replace('&amp;eacute;', 'é');

		//Detect current player death in general logs (has no room, so before room test)
		if (/EV:NERON_HERO_DEATH|EV:OXY_LOW_DAMMIT/.test(html) && charRegexp.exec(html)[0] == currentChar) {
			sortedLogs[logsIndex].roomLogs.push($(this));
			recordRoom = false;
			return true; //jQuery: non-false return = continue
		}

		//If no room is assigned to the log, it can't be used
		var room = /\[ROOM:([^\]]+)\]/.exec(html);
		if (room) {
			room = room[1];
		}
		else {
			return true;
		}

		//Detect movements
		if (/EV:NEW_CREW_MEMBER|EV:CHARACTER_ENTERED/.test(html)) {
			var char = charRegexp.exec(html)[0];
			positions[char] = room;
			//Remove last entry log of this character
			for (var j = 0; j < lastEntry.length; j++) {
				if (lastEntry[j].char == char) {
					lastEntry.splice(j, 1);
				}
			}
			if (char != currentChar) {
				lastEntry.push({ char: char, date: /[0-9]+\.[0-9]+/.exec(html)[0] });
			}

			//Entry of current character
			if (char == currentChar) {
				logsIndex += 1;
				sortedLogs.push({ room: room, charLogs: [], roomLogs: [], beforeLogs: [] });
				movements.push('<em>' + /[0-9]+\.[0-9]+/.exec(html)[0] + '</em> ' + room);

				//People who entered the room before
				for (var j = 0; j < lastEntry.length; j++) {
					if (positions[lastEntry[j].char] == positions[currentChar]) {
						sortedLogs[logsIndex].beforeLogs.push(lastEntry[j]);
					}
				}

				//Add all char logs of this room
				sortedLogs[logsIndex].charLogs.push(allCharLogs.eq(charIndex)); //Entry log
				charIndex += 1;
				while (!/EV:CHARACTER_ENTERED/.test(allCharLogs.eq(charIndex).html())) {
					var charLog = allCharLogs.eq(charIndex);
					charLog.html(charLog.html().replace('<strong>' + currentChar + '</strong>', currentChar));
					sortedLogs[logsIndex].charLogs.push(charLog);
					charIndex += 1;
					if (charIndex == allCharLogsLength) {
						break;
					}
				}
			}
		}

		//Room logs
		if (recordRoom && room == positions[currentChar]) {
			sortedLogs[logsIndex].roomLogs.push($(this));
		}
	});

	//Result popup
	var popup = $('#FDScript-popup');
	if (!popup.length) {
		popup = $('<div>').attr('id', 'FDScript-popup').css({
			position: 'absolute', top: (window.scrollY + 50) + 'px', left: Math.round((window.innerWidth - 800) / 2) + 'px', zIndex: '1500',
			boxSizing: 'border-box', width: '800px', padding: '10px 10px',
			resize: 'both', overflow: 'auto',
			boxShadow: '#000 5px 5px 10px',
			border: '2px #000440 solid', borderRadius: '5px',
			backgroundColor: '#338'
		}).appendTo($('body'));
	}
	else {
		popup.empty();
	}
	$('<img>').css({ position: 'absolute', bottom: 0, right: 0 }).attr({
		src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAANCAYAAABy6+R8AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AIVEy040d+6twAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAXklEQVQoz2NgoCXQbvgiodP05z8DAwMDE7EaGJk4nv//90OSgYGBgZEUDVcbeF4Q1IRNA17noWsg6CdsGvD6CZ8GrH4iRgOK8whpwPATMRqQ/cTEwMDAgOFmAnyyAADp4pEx3U4jiAAAAABJRU5ErkJggg=='
	}).appendTo(popup);
	var zIndex = 1000;
	$('.ui-dialog:visible').each(function() {
		var z = parseInt($(this).css('z-index'));
		if (zIndex < z) {
			zIndex = z;
		}
	});
	popup.css('z-index', zIndex + 1);

	//Title
	var titleDiv = $('<div>').css({ cursor: 'move', fontSize: '0.9em', textAlign: 'center' }).appendTo(popup);
	$('<button>').text("↓").addClass('butbg').css('float', 'left').appendTo(titleDiv).on('click', function() { $('#FDScript-popup').css('z-index', '-=1'); });
	$('<button>').text("↑").addClass('butbg').css('float', 'left').appendTo(titleDiv).on('click', function() { $('#FDScript-popup').css('z-index', '+=1'); });
	var title = $('<h2>').text("Déplacements de " + currentChar).css('user-select', 'none').appendTo(titleDiv);
	$('<button>').text("X").addClass('butbg').css({ position: 'absolute', top: '5px', right: '5px' }).appendTo(titleDiv).on('click', function() { $('#FDScript-popup').remove(); });

	//Draggable popup
	var evX = null;
	var evY = null;
	var moving = false;
	title.on('mousedown', function() {
		moving = true;
		var zIndex = 1000;
		$('.ui-dialog:visible').each(function() {
			var z = parseInt($(this).css('z-index'));
			if (zIndex < z) {
				zIndex = z;
			}
		});
		$('#FDScript-popup').css('z-index', zIndex + 1);
    }).on('mouseup', function() {
		moving = false;
		evX = null;
		evY = null;
    });
	$('body').on('mousemove', function(event) {
		if (moving) {
			if (evX == null) {
				evX = event.pageX;
				evY = event.pageY;
			}
			else {
				var target = $('#FDScript-popup');
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
	$('[data-maproom="6"]').attr('id', 'FDScript-mapselected');
	//SVG doors
	for (var i = 0; i < svgDoors.length; i++) {
		var d = svgDoors[i];
		svg.appendSVG('path', { d: 'm' + d.join(' '), class: 'door' });
	}

	//Rooms
	var pathDiv = $('<div>').css({ maxHeight: '380px', marginTop: '15px', overflowY: 'auto', position: 'relative', fontSize: '0.9em' }).appendTo(left); //'relative' for position() & scroll
	for (var i = 0; i < movements.length; i++) {
		$('<div>').addClass('FDScript-room').css('cursor', 'pointer').html(movements[i]).attr('data-index', i).appendTo(pathDiv).on('click', function() {
			$('#FDScript-roomselected').attr('id', '');
			$(this).attr('id', 'FDScript-roomselected');

			var index = parseInt($(this).attr('data-index'));
			$('.FDScript-logsPack').hide();
			var newPack = $('.FDScript-logsPack[data-index="' + index + '"]');
			newPack.show();

			//topDiv
			$('#FDScript-titleRoom').html(movements[index]);
			$('#FDScript-prevRoom').css('visibility', 'visible');
			$('#FDScript-nextRoom').css('visibility', 'visible');
			if (!newPack.prev().length) { //First room
				$('#FDScript-prevRoom').css('visibility', 'hidden');
			}
			if (!newPack.next().length) { //Last room
				$('#FDScript-nextRoom').css('visibility', 'hidden');
			}

			//Map
			$('#FDScript-mapselected').attr('id', '');
			$('[data-maproom="' + rooms.indexOf(newPack.attr('data-room')) + '"]').attr('id', 'FDScript-mapselected');
		});
	}
	$('.FDScript-room[data-index="0"]').attr('id', 'FDScript-roomselected');

	//Navigation
	var topDiv = $('<div>').css('text-align', 'center').appendTo(right);
	$('<button>').addClass('butbg checkDiv').text("←").attr('id', 'FDScript-prevRoom').css('visibility', 'hidden').appendTo(topDiv).on('click', function() {
		//Previous logs pack
		var currPack = $('.FDScript-logsPack:visible');
		var newPack = currPack.prev();
		currPack.hide();
		newPack.show();

		//Rooms
		$('#FDScript-roomselected').attr('id', '');
		$('.FDScript-room[data-index="' + newPack.attr('data-index') + '"]').attr('id', 'FDScript-roomselected');
		$('#FDScript-roomselected').parent().scrollTop(0); //Reset
		var scroll = $('#FDScript-roomselected').position().top - 200;
		if (scroll < 0) {
			scroll = 0;
		}
		$('#FDScript-roomselected').parent().scrollTop(scroll);

		//topDiv
		if (!newPack.prev().length) { //First room
			$(this).css('visibility', 'hidden');
		}
		$('#FDScript-nextRoom').css('visibility', 'visible');
		$('#FDScript-titleRoom').html(movements[parseInt(newPack.attr('data-index'))]);

		//Map
		$('#FDScript-mapselected').attr('id', '');
		$('[data-maproom="' + rooms.indexOf(newPack.attr('data-room')) + '"]').attr('id', 'FDScript-mapselected');
	});
	$('<span>').html(movements[0]).css({ width: '250px', display: 'inline-block' }).attr('id', 'FDScript-titleRoom').appendTo(topDiv);
	$('<button>').addClass('butbg checkDiv').text("→").attr('id', 'FDScript-nextRoom').appendTo(topDiv).on('click', function() {
		//Next logs pack
		var currPack = $('.FDScript-logsPack:visible');
		var newPack = currPack.next();
		currPack.hide();
		newPack.show();

		//Rooms
		$('#FDScript-roomselected').attr('id', '');
		$('.FDScript-room[data-index="' + newPack.attr('data-index') + '"]').attr('id', 'FDScript-roomselected');
		$('#FDScript-roomselected').parent().scrollTop(0); //Reset
		var scroll = $('#FDScript-roomselected').position().top - 200;
		if (scroll < 0) {
			scroll = 0;
		}
		$('#FDScript-roomselected').parent().scrollTop(scroll);

		//topDiv
		if (!newPack.next().length) { //Last room
			$(this).css('visibility', 'hidden');
		}
		$('#FDScript-prevRoom').css('visibility', 'visible');
		$('#FDScript-titleRoom').html(movements[parseInt(newPack.attr('data-index'))]);

		//Map
		$('#FDScript-mapselected').attr('id', '');
		$('[data-maproom="' + rooms.indexOf(newPack.attr('data-room')) + '"]').attr('id', 'FDScript-mapselected');
	});
	//Inactive in lab = no next movement
	if (movements.length == 1) {
		$('#FDScript-nextRoom').css('visibility', 'hidden');
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
		if (i != 0) {
			pack.hide();
		}

		//People already in the room
		var befDiv = $('<div>').text("Déjà présents : ").css('margin-top', '10px').appendTo(pack);
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
			befDiv.append("personne.");
		}

		//Char logs
		$('<h3>').text("Logs personnels :").css('margin-top', '10px').appendTo(pack);
		var charDiv = $('<div>').css({ overflowY: 'auto', backgroundColor: '#17448E' }).appendTo(pack);
		for (var j = 0; j < sortedLogs[i].charLogs.length; j++) {
			var log = sortedLogs[i].charLogs[j];
			log = highlightActions(log);
			log.prependTo(charDiv);
		}

		//Room logs
		var roomLogsTitle = $('<h3>').text("Logs de la pièce : ").css('margin-top', '10px').appendTo(pack);
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
	var PILGRED = "non.";

	$(generalLogs[id]).find('> div > div > div').each(function() {
		var html = $(this).html().replace('&amp;eacute;', 'é');
		if (/EV:HUNTER_WAVE_INC/.test(html)) {
			waves.push(/[0-9]+\.[0-9]+/.exec(html)[0]);
		}
		else if (/EV:RATION_PERISHED/.test(html)) {
			date = /[0-9]+\.[0-9]+/.exec(html)[0];
			if (perished.indexOf(date) == -1) { //Avoid repetitions
				perished.push(date);
			}
		}
		else if (/AC:DELOG/.test(html)) {
			defaced.push([/[0-9]+\.[0-9]+/.exec(html)[0], /\[ROOM:([^\]]+)\]/.exec(html)[1]]); //[date, room]
		}
		else if (/EV:PILGRED_DONE/.test(html)) {
			PILGRED = /[0-9]+\.[0-9]+/.exec(html)[0] + ".";
		}
	});

	//Result
	waves = ((waves.length) ? waves.reverse().join(", ") + " (" + waves.length + ")." : "aucune.");
	perished = ((perished.length) ? perished.reverse().join(", ") + "." : "jamais.");
	if (defaced.length) {
		for (var i = 0; i < defaced.length; i++) {
			defaced[i] = defaced[i][1] + " (" + defaced[i][0] + ")";
		}
		defaced = defaced.reverse().join(", ") + ".";
	}
	else {
		defaced = "aucune.";
	}
	$('<div>').html("<b>Vagues de hunters :</b> " + waves).appendTo(shipDiv);
	$('<div>').html("<b>Destruction des rations périmées :</b> " + perished).appendTo(shipDiv);
	$('<div>').html("<b>Pièces dialoguées :</b> " + defaced).appendTo(shipDiv);
	$('<div>').html("<b>PILGRED réparé :</b> " + PILGRED).appendTo(shipDiv);
}

function evaluateSin(qualif) {
	var result;
	if (/Rien/.test(qualif)) {
		result = 0;
	}
	else if (/Mush/.test(qualif)) {
		result = 1;
	}
	else if (/Pourrissage/.test(qualif)) {
		result = 2;
	}
	else if (/Incitation/.test(qualif)) {
		result = 3;
	}
	else if (/Langage/.test(qualif)) {
		result = 4;
	}
	else {
		result = 5;
	}
	return result;
}

function start() {
	console.log('starting FDScript');
	var currentShip = -1;
	var previousChun, currChun = "";
	var displayedShip = 0;

	//Scan through all reports
	$("div.fds_control_bloc.cdControl").each(function() {
		var block = $(this);
		var histoLink, currChun = '';

		//Get plaintee & Chun histoLink
		var plainteeDiv = block.find('.inl-blck').eq(1);
		block.find('.cdProof .fds_char_pack').each(function() {
			var currChar = $(this).find('.fdsName').text();
			if (currChar == plainteeDiv.find('.fdsName').text()) {
				histoLink = $(this).find('a').attr('href');
			}
			else if (currChar.toLowerCase() == "chun") {
				currChun = $(this).find('a').attr('href');
			}
		});

		//Interpret HTML tags and character codes in reports
		block.find('.cdReason li').each(function() {
			$(this).html($(this).text());
		});

		//Sort judging options
		var select = block.find('.judge_bloc select');
		var names = ["", "Mush", "Pourrissage", "Incitation", "Langage", "Autres"];
		var sanctions = [[], [], [], [], [], []]; //Categories
		select.find('option').each(function() {
			sanctions[evaluateSin($(this).text())].push([$(this).text().trim(), $(this).attr('data-id')]); //Name and data-id
			$(this).remove();
		});
		for (var i = 0; i < sanctions.length; i++) {
			if (i > 0) {
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
				var parent = $('<optgroup>').attr('label', names[i]).appendTo(select);
			}
			else {
				var parent = select;
			}
			for (var j = 0; j < sanctions[i].length; j++) {
				$('<option>').text(sanctions[i][j][0]).attr('data-id', sanctions[i][j][1]).appendTo(parent);
			}
		}

		//Check if Mush or human
		$('<input>').attr({
			type: 'button', value: 'check', 'data-histolink': histoLink, 'data-block-id': block.attr('data-id')
		}).addClass('butbg').on('click', function() {
			loadXMLDoc($(this).attr('data-histolink'), displayTreatment, [$(this).attr('data-block-id')]);
			$(this).prop('disabled', true);
		}).appendTo(plainteeDiv);


		//Sort reports by ship
		if (currChun == previousChun) { //Same ship than the previous report
			block.parent().addClass('allships shipNum' + currentShip);
		}
		else {
			currentShip += 1;
			block.parent().addClass('allships shipNum' + currentShip);
			previousChun = currChun;
			//Separator
			$('<div>').addClass('divSep').hide().insertAfter(block.parent());
		}
	});

	//Fix displaying Mush channel
	$('a [href*="mushLog"]').attr("onclick", "Main.ajaxPopup($(this).attr('href'), { width: '600px', dialogClass: 'mushWall' }); return false;");

	//Display number of reports and ships
	$('.fds_bloc').eq(2).find('h2').append(" : " + $("div.fds_control_bloc.cdControl").length + " plaintes dans " + (currentShip + 1) + " vaisseaux.");

	//Navigation buttons (initially hidden)
	var buttonsDiv = $('<div>').hide().prependTo($('.fds_big_judge'));

	//Logs height parameter
	var logsHeight = localStorage['FDScript-logsHeight'];
	if (logsHeight == undefined) {
		logsHeight = 230;
	}
	var paramsDiv = $('<div>').insertBefore(buttonsDiv);
	$('<label>').attr('for', 'FDScript-logsHeight').text("Hauteur des fenêtres de logs : ").appendTo(paramsDiv);
	$('<input>').attr({
		type: 'number', min: 10, value: logsHeight, name: 'FDScript-logsHeight'
	}).css({
		color: 'black', width: '5em'
	}).appendTo(paramsDiv).on('change', function() {
		var logsHeight = $(this).val();
		$('style:contains("logsHeight")').remove();
		addGlobalStyle(".cdUserlogs > div, .cdPrivateChannels > div, .cdMissions, .cdAnnounces, .FDScript-logsPack div, .FDScript-mushChannel { max-height: " + logsHeight + "px !important; } /*logsHeight*/");
		localStorage['FDScript-logsHeight'] = logsHeight;
		if (logsHeight == '42') {
			$('#FDScript-easterEgg').show();
		}
		else {
			$('#FDScript-easterEgg').hide();
		}
	});;
	paramsDiv.append("px");
	$('<div>').html("Ô blas bougriot glabouilleux,<br />Tes micturations me touchent<br />Comme des flatouillis slictueux<br />Sur une blotte mouche<br />Grubeux, je t'implore<br />Car mes fontins s'empalindroment…<br />Et surrénalement me sporent<br />De croinçantes épiquarômes.<br />Ou sinon… nous t'échierons dans les gobinapes :<br />Du fond de notre patafion,<br />Tu verras si j'en suis pas cap !").attr('id', 'FDScript-easterEgg').hide().appendTo($('.readmore'));
	
	/* Some vars are declared to be used later, keep them */
	//Ship-by-ship controls
	var viewDiv = $('<div>').insertBefore(buttonsDiv);
	var viewCheck = $('<input>').attr({ type: 'checkbox', id: 'viewBox' }).appendTo(viewDiv);
	$('<label>').text("Vue par vaisseau").appendTo(viewDiv);

	//One-by-one controls
	var altDiv = $('<div>').insertBefore(buttonsDiv);
	var altCheck = $('<input>').attr({ type: 'checkbox', id: 'altBox' }).appendTo(altDiv);
	$('<label>').text("Vue globale triée").appendTo(altDiv);

	//Sort by game number
	var sortDiv = $('<div>').insertBefore(buttonsDiv);
	var sortCheck = $('<input>').attr({ type: 'checkbox', id: 'sortBox' }).appendTo(sortDiv);
	var labSortCheck = $('<label>').text("Tri par nombre de parties (desc.)").appendTo(sortDiv);
	
	//Previous and next ship buttons
	$('<button>').text('←').addClass('butbg checkDiv').on('click', function() {
		if (displayedShip > 0) {
			$('.shipNum' + displayedShip).hide();
			//Switch to previous ship
			displayedShip -= 1;
			$('.shipNum' + displayedShip).show();
		}
	}).appendTo(buttonsDiv); //Previous
	$('<button>').text('→').addClass('butbg checkDiv').on('click', function() {
		if (displayedShip < currentShip) { //currentShip now equals the total number of ships
			$('.shipNum' + displayedShip).hide();
			//Switch to next ship
			displayedShip += 1;
			$('.shipNum' + displayedShip).show();
		}
	}).appendTo(buttonsDiv); //Next

	//View checkbox function
	viewCheck.on('change', function() {
		if (this.checked) {
			//Hide all ships but the first
			$('.allships').hide();
			$('.shipNum' + displayedShip).show();

			//Show buttons
			buttonsDiv.show();

			//De-check other inputs
			if (altCheck.is(':checked')) {
				altCheck.click();
			}
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
			var sortText = "Tri par nombre de parties (asc.)";
		}
		else {
			var greater = -1;
			var lesser = 1;
			var sortText = "Tri par nombre de parties (desc.)";
		}

		var reports = $("li.allships");
		var mainUl = $("ul.fds_big_judge");
		//Sort all reports
		reports.sort(function(a, b) {
			var pattGames = /Nb de Partie : (\d*)/;
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
		mainUl.find("li.allships").remove();
		mainUl.append(reports);
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
		$('<button>').text("Analyse des logs généraux").addClass('butbg checkDiv').css('font-size', '0.9em !important').attr('data-ship-id', shipId).prependTo($(this)).on('click', function() {
			$(this).prop('disabled', true);
			var id = $(this).attr('data-ship-id');

			//Load logs
			if (!generalLogs.hasOwnProperty(id)) {
				$(this).prepend($('<img>').attr('src', '/img/icons/ui/loading1.gif'));
				loadXMLDoc('http://' + document.domain + id, function(request) {
					if (request.readyState == 4 && request.status == 200) {
						generalLogs[id] = request.responseText;
						console.log('fetched general logs from ' + id);
						generalAnalysis(shipDiv, id);
						$('[src*="/img/icons/ui/loading1.gif"]').remove();
					}
				}, []);
			}
			else {
				generalAnalysis(shipDiv, id);
			}
		});
	});
	
	//Player logs analysis
	setInterval(function() {
		//Expedition links in new tab
		$('.ui-dialog a[href]').attr('target', '_blank');

		//Scrollable mush channel
		var mush = $('.ui-dialog-content:not(.FDScript-mushChannel) > li');
		if (mush.length) {
			mush.parent().addClass('FDScript-mushChannel');
		}

		//Personal logs
		var logs = $('.ui-dialog:visible .fdsStory:not(.cdShipLog):not(.cdWalls):not(.scripted)');
		if (logs.length) {
			$('[onclick*="slideDown"]').attr('onclick', '$(this).parent().next().slideToggle(); return false;'); //Bugfix
			logs.addClass('scripted');
			var topDiv = $('<div>').insertBefore(logs);

			//Character logs analysis
			$('<button>').text("Analyse des logs").addClass('butbg checkDiv').appendTo(topDiv).on('click', function() {
				$(this).prop('disabled', true);
				var skills = [];

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
				});

				//Skills result
				skills = ((skills.length) ? skills.reverse().join(", ") : "aucune.");
				$('<div>').text("Compétences : " + skills).css('font-size', '0.9em').appendTo(topDiv);
			});

			//Player map
			$('<button>').text("Analyse des déplacements").addClass('butbg checkDiv').css('margin-left', '10px').appendTo(topDiv).on('click', function() {
				//Load ship logs
				var allCharLogs = logs.find('.cdUserlogs div div').clone();
				if (!generalLogs.hasOwnProperty(currentLogs)) {
					$(this).prepend($('<img>').attr('src', '/img/icons/ui/loading1.gif'));
					loadXMLDoc('http://' + document.domain + currentLogs, function(request) {
						if (request.readyState == 4 && request.status == 200) {
							generalLogs[currentLogs] = request.responseText;
							console.log('fetched general logs from ' + currentLogs);
							charMovements(allCharLogs);
							$('[src*="/img/icons/ui/loading1.gif"]').remove();
						}
					}, []);
				}
				else {
					charMovements(allCharLogs);
				}
			});

			//Divide private channels
			var privates = logs.find('.cdPrivateChannels');
			if (privates.length) {
				$('<button>').text("Découpage des canaux privés").addClass('butbg checkDiv').css('margin-left', '10px').appendTo(topDiv).on('click', function() {
					var number = 0;
					var members = [];
					var index = 0;
					var channels = [[]];
					var charRegexp = /Jin Su|Frieda|Kuan Ti|Janice|Roland|Hua|Paola|Chao|Finola|Stephen|Ian|Chun|Raluca|Gioele|Eleesha|Terrence|Derek|Andie/;

					//Add channel members mugshots
					function addMembers(log) {
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

					privates.find('> div > div').each(function() {
						var text = $(this).text();
						if (/a rejoint la discussion/.test(text)) {
							number += 1;
							members.push(charRegexp.exec(text)[0]);
							addMembers($(this));
						}
						else if (/a quitté la discussion/.test(text)) {
							number -= 1;
							members.splice(members.indexOf(charRegexp.exec(text)[0]), 1);
							addMembers($(this));
						}
						channels[index].push($(this));
						if (!number) {
							channels.push([]);
							index += 1;
						}
					});
					//Create a div for each channel
					for (var i = 0; i < channels.length; i++) {
						if (!channels[i].length) { //Last "channel" (empty)
							continue;
						}
						var channel = $('<div>').css({ padding: '5px 0', margin: '5px 0', borderBottom: '2px dotted red' }).appendTo(privates.find('> div'));
						$('<h3>').text("Canal n°" + (i + 1)).appendTo(channel);
						for (var j = 0; j < channels[i].length; j++) {
							channels[i][j].appendTo(channel);
						}
					}
				});
			}
		}
	}, 100);
}


//CSS in <head>
var logsHeight = localStorage['FDScript-logsHeight'];
if (logsHeight == undefined) {
	logsHeight = 230;
}
addGlobalStyle(".cdUserlogs > div, .cdPrivateChannels > div, .cdWalls, .cdShipLog, .cdChannels, .cdMissions, .cdAnnounces, .mushWall > div.cdDialog, .FDScript-mushChannel { overflow: auto !important;\n position: relative !important; }");
addGlobalStyle(".cdUserlogs > div, .cdPrivateChannels > div, .cdMissions, .cdAnnounces, .FDScript-logsPack div, .FDScript-mushChannel { max-height: " + logsHeight + "px !important; } /* logsHeight */");
addGlobalStyle(".cdWalls, .cdShipLog, .cdChannels, .mushWall > div.cdDialog { height: 500px !important; }");
addGlobalStyle(".cdChannels { font-size: 0.9em; }");
addGlobalStyle(".cdChan:not(:last-of-type), .cdMissions ul:not(:last-of-type), .cdAnnounces ul:not(:last-of-type) { margin: 5px 0; padding: 5px 0; border-bottom: 2px dotted red; }");
addGlobalStyle(".checkDiv { display: inline-block; font-size: 10pt !important; }");
addGlobalStyle(".divSep { display: block;\n border-top-style: dotted;\n border-top-color: red;\n width: 700px; }");
addGlobalStyle("svg * { fill: #FFF; stroke: #000; }");
addGlobalStyle("svg path.door { stroke: #11F; stroke-width: 2; }");
addGlobalStyle("#FDScript-mapselected { fill: #FF0 !important; }");
addGlobalStyle("#FDScript-roomselected { background-color: #83B; }");
addGlobalStyle(".FDScript-room:hover { background-color: #94C; }");
addGlobalStyle("#FDScript-popup strong { color: #F13; }");


if ($('.pol2.fds_bloc').length) { //Moderators
	$('<button>').text("Lancer le script FDS").addClass('butbg checkDiv').insertBefore($('.cdRecTgtComplaint')).on('click', function() {
		start();
	});
}
else { //Judges
	start();
}
