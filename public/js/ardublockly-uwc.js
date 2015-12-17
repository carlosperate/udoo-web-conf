/**
 * @fileoverview JavaScript to configure Ardublockly front end for
 *     UDOO-web-conf.
 */
'use strict';

/** Create a namespace for the application. */
var Ardublockly = Ardublockly || {};


/** Initialize function for Ardublockly on page load. */
window.addEventListener('load', function load(event) {
  window.removeEventListener('load', load, false);
  // Inject Blockly into content_blocks
  Ardublockly.injectBlockly(document.getElementById('content_blocks'),
        '/ardublockly/ardublockly/ardublockly_toolbox.xml');

  Ardublockly.designJsInit();

  Ardublockly.bindEventListeners();
  Ardublockly.bindBlocklyEventListeners();
});

/** Initialises all the design related JavaScript. */
Ardublockly.designJsInit = function() {
  Ardublockly.resizeToggleToolboxBotton();
};

/** Binds the event listeners relevant to the page design. */
Ardublockly.bindEventListeners = function() {
  // Resize blockly workspace on window resize
  window.addEventListener('resize', Ardublockly.resizeBlocklyWorkspace, false);

  Ardublockly.bindClick_('button_new', Ardublockly.discardAllBlocks);
  Ardublockly.bindClick_('button_load', Ardublockly.loadUserXmlFile);
  Ardublockly.bindClick_('button_save', Ardublockly.saveXmlFileAs);
  Ardublockly.bindClick_('button_upload', Ardublockly.sendCode);
  Ardublockly.bindClick_('button_toggle_toolbox', Ardublockly.toogleToolbox);
};

/**
 * Loads an XML file from the server and adds the blocks into the Blockly
 * workspace.
 * @param {!string} xmlFile Server location of the XML file to load.
 */
Ardublockly.loadServerXmlFile = function(xmlFile) {
  // The loadXmlBlockFile loads the file asynchronously and needs a callback
  var loadXmlCallback = function(sucess) {
    if (sucess) {
      Ardublockly.renderContent();
    } else {
        alert('Invalid XML\n' +
              'The XML file was not successfully parsed into blocks.' +
              'Please review the XML code and try again.');
    }
  };
  var callbackConnectionError = function() {
    alert('Probably not connected to the server');
  };
  Ardublockly.loadXmlBlockFile(
      xmlFile, loadXmlCallback, callbackConnectionError);
};

/**
 * Loads an XML file from the users file system and adds the blocks into the
 * Blockly workspace.
 */
Ardublockly.loadUserXmlFile = function() {
  // Create event listener function
  var parseInputXMLfile = function(e) {
    var files = e.target.files;
    var reader = new FileReader();
    reader.onload = function() {
      var success = Ardublockly.replaceBlocksfromXml(reader.result);
      if (success) {
        Ardublockly.renderContent();
      } else {
        alert('Invalid XML\n' +
            'The XML file was not successfully parsed into blocks.' +
            'Please review the XML code and try again.');
      }
    };
    reader.readAsText(files[0]);
  };
  // Create once invisible browse button with event listener, and click it
  var selectFile = document.getElementById('select_file');
  if (selectFile == null) {
    var selectFileDom = document.createElement('INPUT');
    selectFileDom.type = 'file';
    selectFileDom.id = 'select_file';

    var selectFileWrapperDom = document.createElement('DIV');
    selectFileWrapperDom.id = 'select_file_wrapper';
    selectFileWrapperDom.style.display = 'none';
    selectFileWrapperDom.appendChild(selectFileDom);

    document.body.appendChild(selectFileWrapperDom);
    selectFile = document.getElementById('select_file');
    selectFile.addEventListener('change', parseInputXMLfile, false);
  }
  selectFile.click();
};

/**
 * Creates an XML file containing the blocks from the Blockly workspace and
 * prompts the users to save it into their local file system.
 */
Ardublockly.saveXmlFileAs = function() {
  var xmlName = 'ardublockly_blocks';
  var blob = new Blob(
      [Ardublockly.generateXml()],
      {type: 'text/plain;charset=utf-8'});
  saveAs(blob, xmlName + '.xml');
};

/**
 * Creates an Arduino Sketch file containing the Arduino code generated from
 * the Blockly workspace and prompts the users to save it into their local file
 * system.
 */
Ardublockly.saveSketchFileAs = function() {
  var sketchName = 'ardublockly_sketch';
  var blob = new Blob(
      [Ardublockly.generateArduino()],
      {type: 'text/plain;charset=utf-8'});
  saveAs(blob, sketchName + '.ino');
};

/**
 * Send the Arduino Code to the ArdublocklyServer to process.
 * Shows a loader around the button, blocking it (unblocked upon received
 * message from server).
 */
Ardublockly.sendCode = function() {
  alert(Ardublockly.generateArduino());
};

/** Populate the workspace blocks with the XML written in the XML text area. */
Ardublockly.XmlTextareaToBlocks = function() {
  var success = Ardublockly.replaceBlocksfromXml(
      document.getElementById('content_xml').value);
  if (success) {
    Ardublockly.renderContent();
  } else {
    alert(
        'Invalid XML\n' +
        'The XML inputted into the text area was not successfully parsed into' +
        'blocks. Please review the XML code and try again.');
  }
};


/**
 * Private variable to save the previous version of the Arduino Code.
 * @type {!String}
 * @private
 */
Ardublockly.PREVIOUS_ARDUINO_CODE_ =
    'void setup() {\n\n}\n\n\nvoid loop() {\n\n}';

/**
 * Populate the Arduino Code and Blocks XML panels with content generated from
 * the blocks.
 */
Ardublockly.renderContent = function() {
  // Only regenerate the code if a block is not being dragged
  if (Ardublockly.blocklyIsDragging()) {
    return;
  }

  // Render Arduino Code with latest change highlight and syntax highlighting
  var arduinoCode = Ardublockly.generateArduino();
  if (arduinoCode !== Ardublockly.PREVIOUS_ARDUINO_CODE_) {
    var arduinoContent = document.getElementById('content_arduino');
    // Sets content in case of no pretify and serves as a fast way to scape html
    arduinoContent.textContent = arduinoCode;
    arduinoCode = arduinoContent.innerHTML;
    if (typeof prettyPrintOne == 'function') {
      var diff = JsDiff.diffWords(Ardublockly.PREVIOUS_ARDUINO_CODE_,
                                  arduinoCode);
      var resultStringArray = [];
      for (var i = 0; i < diff.length; i++) {
        if (diff[i].added) {
          resultStringArray.push(
            '<span class="code_highlight_new">' + diff[i].value + '</span>');
        } else if (!diff[i].removed) {
          resultStringArray.push(diff[i].value);
        }
      }
      var codeHtml = prettyPrintOne(resultStringArray.join(''), 'cpp', false);
      arduinoContent.innerHTML = codeHtml;
    }
    Ardublockly.PREVIOUS_ARDUINO_CODE_ = arduinoCode;
  }

  // Generate plain XML into element
  var xmlContent = document.getElementById('content_xml');
  xmlContent.value = Ardublockly.generateXml();
};

/**
 * Private variable to indicate if the toolbox is meant to be shown.
 * @type {!boolean}
 * @private
 */
Ardublockly.TOOLBAR_SHOWING_ = true;

/**
 * Toggles the blockly toolbox and the Ardublockly toolbox button On and Off.
 * Uses namespace member variable TOOLBAR_SHOWING_ to toggle state.
 */
Ardublockly.toogleToolbox = function() {
  if (Ardublockly.TOOLBAR_SHOWING_) {
    Ardublockly.blocklyCloseToolbox();
    Ardublockly.displayToolbox(false);
  } else {
    Ardublockly.displayToolbox(true);
  }
  Ardublockly.TOOLBAR_SHOWING_ = !Ardublockly.TOOLBAR_SHOWING_;
};

/**
 * Returns a boolean indicating if the toolbox is currently visible.
 * @return {boolean} Indicates if the toolbox is currently visible.
 */
Ardublockly.isToolboxVisible = function() {
  return Ardublockly.TOOLBAR_SHOWING_;
};

/**
 * Sets the toolbox HTML element to be display or not and change the visibility
 * button to reflect the new state.
 * When the toolbox is visible it should display the "visibility-off" icon with
 * no background, and the opposite when toolbox is hidden.
 * @param {!boolean} show Indicates if the toolbox should be set visible.
 */
Ardublockly.displayToolbox = function(show) {
  var toolbox = $('.blocklyToolboxDiv');
  var toolboxTree = $('.blocklyTreeRoot');
  var button = document.getElementById('button_toggle_toolbox');
  var buttonIcon = document.getElementById('button_toggle_toolbox_icon');

  // Because firing multiple clicks can confuse the animation, create an overlay
  // element to stop clicks (due to the materialize framework controlling the
  // event listeners is better to do it this way for easy framework update).
  var elLocation = $('#button_toggle_toolbox').offset();
  jQuery('<div/>', {
      id: 'toolboxButtonScreen',
      css: {
        position: 'fixed',
        top: elLocation.top,
        left: elLocation.left,
        height: $('#button_toggle_toolbox').height(),
        width: $('#button_toggle_toolbox').width(),
        cursor: 'pointer',
        zIndex: 12
      },
  }).appendTo('body');

  var classOn = 'button_toggle_toolbox_on';
  var classOff = 'button_toggle_toolbox_off';
  var visOn = 'fa fa-eye fa';
  var visOff = 'fa fa-eye-slash fa';
  if (show) {
    toolbox.show();
    button.className = button.className.replace(classOn, classOff);
    buttonIcon.className = buttonIcon.className.replace(visOn, visOff);
    toolbox.animate(
        {height: document.getElementById('content_blocks').style.height}, 300,
        function() {
          toolboxTree.css("overflow-y", "auto");
          Blockly.fireUiEvent(window, 'resize');
          $('#toolboxButtonScreen').remove();
        });
  } else {
    toolboxTree.css("overflow-y", "hidden");
    buttonIcon.className = buttonIcon.className.replace(visOff, visOn);
    toolbox.animate({height: 38}, 300, function() {
      button.className = button.className.replace(classOff, classOn);
      toolbox.fadeOut(350, 'linear', function() {
        Blockly.fireUiEvent(window, 'resize');
        setTimeout(function() { toolbox.height(38); }, 100);
        $('#toolboxButtonScreen').remove();
      });
    });
  }
};

/**
 * Resizes the button to toggle the toolbox visibility to the width of the
 * toolbox.
 * The toolbox width does not change with workspace width, so safe to do once,
 * but it needs to be done after blockly has been injected.
 */
Ardublockly.resizeToggleToolboxBotton = function() {
  // As the toolbox inject is asynchronous we need to wait
  if (Ardublockly.isBlocklyInjected() === false) {
    setTimeout(Ardublockly.resizeToggleToolboxBotton, 50);
  } else {
    Blockly.fireUiEvent(window, 'resize');
    var button = $('#button_toggle_toolbox');
    // Sets the toolbox toggle button width to that of the toolbox
    if (Ardublockly.isToolboxVisible() && Ardublockly.blocklyToolboxWidth()) {
      // For some reason normal set style and getElementById didn't work
      button.width(Ardublockly.blocklyToolboxWidth());
      button[0].style.display = '';
    }
  }
};

/** Resizes the container for the Blockly workspace. */
Ardublockly.resizeBlocklyWorkspace = function() {
  var contentBlocks = document.getElementById('content_blocks');
  var wrapperPanelSize =
      Ardublockly.getBBox_(document.getElementById('blocks_panel'));

  contentBlocks.style.top = wrapperPanelSize.y + 'px';
  contentBlocks.style.left = wrapperPanelSize.x + 'px';
  // Height and width need to be set, read back, then set again to
  // compensate for scrollbars.
  contentBlocks.style.height = wrapperPanelSize.height + 'px';
  contentBlocks.style.height =
      (2 * wrapperPanelSize.height - contentBlocks.offsetHeight) + 'px';
  contentBlocks.style.width = wrapperPanelSize.width + 'px';
  contentBlocks.style.width =
      (2 * wrapperPanelSize.width - contentBlocks.offsetWidth) + 'px';
};

/**
 * Bind a function to a button's click event.
 * On touch enabled browsers, ontouchend is treated as equivalent to onclick.
 * @param {!Element|string} el Button element or ID thereof.
 * @param {!function} func Event handler to bind.
 * @private
 */
Ardublockly.bindClick_ = function(el, func) {
  if (typeof el == 'string') {
    el = document.getElementById(el);
  }
  // Need to ensure both, touch and click, events don't fire for the same thing
  var propagateOnce = function(e) {
    e.stopPropagation();
    e.preventDefault();
    func();
  };
  el.addEventListener('ontouchend', propagateOnce);
  el.addEventListener('click', propagateOnce);
};

/**
 * Compute the absolute coordinates and dimensions of an HTML element.
 * @param {!Element} element Element to match.
 * @return {!Object} Contains height, width, x, and y properties.
 * @private
 */
Ardublockly.getBBox_ = function(element) {
  var height = element.offsetHeight;
  var width = element.offsetWidth;
  var x = 0;
  var y = 0;
  do {
    x += element.offsetLeft;
    y += element.offsetTop;
    element = element.offsetParent;
  } while (element);
  return {
    height: height,
    width: width,
    x: x,
    y: y
  };
};


Ardublockly.materialAlert = function(title, body, confirm, callback) {
  var fullMessage = title + '\n' + body;
  if (confirm) {
    if (window.confirm(fullMessage)) {
        callback.call();
    }
  } else {
      window.alert(fullMessage);
  }
};
