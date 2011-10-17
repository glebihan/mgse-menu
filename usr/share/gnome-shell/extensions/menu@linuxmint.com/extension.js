/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

const Mainloop = imports.mainloop;
const GMenu = imports.gi.GMenu;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const AppFavorites = imports.ui.appFavorites;
const Gtk = imports.gi.Gtk;

const ICON_SIZE = 16;
const FAV_ICON_SIZE = 30;
const CATEGORY_ICON_SIZE = 20;
const APPLICATION_ICON_SIZE = 20;

let appsys = Shell.AppSystem.get_default();

function AppMenuItem() {
    this._init.apply(this, arguments);
}

AppMenuItem.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,

    _init: function (app, params) {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);

        this._app = app;
        this.label = new St.Label({ text: app.get_name() });
        this.addActor(this.label);
        this._icon = app.create_icon_texture(ICON_SIZE);
        this.addActor(this._icon, { expand: false });
    },

    activate: function (event) {
        this._app.activate_full(-1, event.get_time());
        PopupMenu.PopupBaseMenuItem.prototype.activate.call(this, event);
    }

};

function ApplicationButton(app) {
    this._init(app);
}

ApplicationButton.prototype = {
    _init: function(app) {
		this.app = app;			        
        this.actor = new St.Button({ reactive: true, label: this.app.get_name(), style_class: 'application-button', x_align: St.Align.START });        
        this.buttonbox = new St.BoxLayout();
        this.label = new St.Label({ text: this.app.get_name(), style_class: 'application-button-label' });        
        this.icon = this.app.create_icon_texture(APPLICATION_ICON_SIZE); 
        this.buttonbox.add_actor(this.icon);
        this.buttonbox.add_actor(this.label);
        this.actor.set_child(this.buttonbox);
        if (this.app.get_description())
            this.actor.set_tooltip_text(this.app.get_description());
        this.actor.connect('clicked', Lang.bind(this, function() {      
			this.app.open_new_window(-1);
            appsMenuButton.menu.close();
		}));
    }
};

function CategoryButton(app) {
    this._init(app);
}

CategoryButton.prototype = {
    _init: function(category) {	
		this.icon_name = category.get_icon().get_names().toString();
        this.actor = new St.Button({ reactive: true, label: category.get_name(), style_class: 'category-button', x_align: St.Align.START  });        
        this.buttonbox = new St.BoxLayout();
        this.label = new St.Label({ text: category.get_name(), style_class: 'category-button-label' }); 
        this.icon = new St.Icon({icon_name: this.icon_name, icon_size: CATEGORY_ICON_SIZE, icon_type: St.IconType.FULLCOLOR});             
        this.buttonbox.add_actor(this.icon);
        this.buttonbox.add_actor(this.label);
        this.actor.set_child(this.buttonbox);
        //this.actor.set_tooltip_text(category.get_name());       
    }
};

function FavoritesButton(app) {
    this._init(app);
}

FavoritesButton.prototype = {
    _init: function(app) {
        this.actor = new St.Button({ reactive: true, style_class: 'favorites-button' });
        this.actor.set_child(app.create_icon_texture(FAV_ICON_SIZE));
        this.actor.set_tooltip_text(app.get_name());
        this._app = app;

        this.actor.connect('clicked', Lang.bind(this, function() {		
            this._app.open_new_window(-1);
            appsMenuButton.menu.close();
        }));
    }
};

function ApplicationsButton() {
    this._init();
}

ApplicationsButton.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    _init: function() {
        PanelMenu.SystemStatusButton.prototype._init.call(this, 'start-here');
        this._display();
        appsys.connect('installed-changed', Lang.bind(this, this.reDisplay));
        AppFavorites.getAppFavorites().connect('changed', Lang.bind(this, this.reDisplay));
    },

    reDisplay : function() {
        this._clearAll();
        this._display();
    },

    _clearAll : function() {
        this.menu.removeAll();
    },
   
    _loadCategory: function(dir) {
        var iter = dir.iter();
        var nextType;
        while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
            if (nextType == GMenu.TreeItemType.ENTRY) {
                var entry = iter.get_entry();
                if (!entry.get_app_info().get_nodisplay()) {
					var app = appsys.lookup_app_by_tree_entry(entry);		
                	if (!this.applicationsByCategory[dir.get_menu_id()]) this.applicationsByCategory[dir.get_menu_id()] = new Array();			
					this.applicationsByCategory[dir.get_menu_id()].push(app);					
				}
            } else if (nextType == GMenu.TreeItemType.DIRECTORY) {
                this._loadCategory(iter.get_directory());
            }
        }
    },
               
    _display : function() {
        let section = new PopupMenu.PopupMenuSection();        
        this.menu.addMenuItem(section);            
        let favoritesTitle = new St.Label({ track_hover: true, style_class: 'favorites-title', text: "Favorites" });
        this.favoritesBox = new St.BoxLayout({ style_class: 'favorites-box' }); 
        
        this.categoriesApplicationsBox = new St.BoxLayout();
        this.categoriesBox = new St.BoxLayout({ style_class: 'categories-box', vertical: true }); 
        this.applicationsScrollBox = new St.ScrollView({ x_fill: true, y_fill: false, y_align: St.Align.START, style_class: 'vfade applications-scrollbox' });
        this.applicationsBox = new St.BoxLayout({ style_class: 'applications-box', vertical:true });
        this.applicationsScrollBox.add_actor(this.applicationsBox)
        this.applicationsScrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.categoriesApplicationsBox.add_actor(this.categoriesBox);
        this.categoriesApplicationsBox.add_actor(this.applicationsScrollBox);
                     
        //Load favorites                 
        let launchers = global.settings.get_strv('favorite-apps');
		let appSys = Shell.AppSystem.get_default();
        let j = 0;
        for ( let i = 0; i < launchers.length; ++i ) {
			let app = appSys.lookup_app(launchers[i]);
            if (app) {        
                let button = new FavoritesButton(app, this.menu);                
                this.favoritesBox.add_actor(button.actor);
                ++j;
            }
        }
        
        
        let applicationsTitle = new St.Label({ style_class: 'applications-title', text: "Applications" });
 
		section.actor.add_actor(favoritesTitle, { span: 1 });
        section.actor.add_actor(this.favoritesBox, { span: 1 });
		section.actor.add_actor(applicationsTitle, { span: 1 });
		section.actor.add_actor(this.categoriesApplicationsBox, { span: 1 });
        
		this.applicationsByCategory = {};
        let tree = appsys.get_tree();
        let root = tree.get_root_directory();

        let iter = root.iter();
        let nextType;
        while ((nextType = iter.next()) != GMenu.TreeItemType.INVALID) {
            if (nextType == GMenu.TreeItemType.DIRECTORY) {
                let dir = iter.get_directory();                            
                this.applicationsByCategory[dir.get_menu_id()] = new Array();
                this._loadCategory(dir);                
                let categoryButton = new CategoryButton(dir);
                categoryButton.actor.connect('clicked', Lang.bind(this, function() {
					this._select_category(dir, categoryButton);
				}));
				categoryButton.actor.connect('enter-event', Lang.bind(this, function() {
					this._select_category(dir, categoryButton);
				}));
                this.categoriesBox.add_actor(categoryButton.actor);
            }
        }
        
        // Not necessary yet.. will be used to show all apps in an "all category"
        //for (directory in this.applicationsByCategory) {
		//	let apps = this.applicationsByCategory[directory];		
		//	for (var i=0; i<apps.length; i++) {
		//		let app = apps[i];			
		//	}						
		//}
    },
    
     _select_category : function(dir, categoryButton) {			 
		 let actors = this.applicationsBox.get_children();
		 for (var i=0; i<actors.length; i++) {
			let actor = actors[i];			
			this.applicationsBox.remove_actor(actor);	
		 }
         
         let actors = this.categoriesBox.get_children();

         for (var i=0; i<actors.length; i++){
             let actor = actors[i];      
             if (actor==categoryButton.actor) actor.style_class = "category-button-selected";
             else actor.style_class = "category-button";
         }
		  
		 let apps = this.applicationsByCategory[dir.get_menu_id()];				 
		 for (var i=0; i<apps.length; i++) {
			let app = apps[i];			
			let applicationButton = new ApplicationButton(app);			
			this.applicationsBox.add_actor(applicationButton.actor);			
		 }
	 }
};

let appsMenuButton;

function enable() {   
    Main.panel._leftBox.insert_actor(appsMenuButton.actor, 0);
    Main.panel._leftBox.child_set(appsMenuButton.actor, { y_fill : true } );
    Main.panel._menus.addMenu(appsMenuButton.menu);
}

function disable() {
    appsMenuButton.destroy();
}

function init() {
    appsMenuButton = new ApplicationsButton();
    Main.panel._leftBox.insert_actor(appsMenuButton.actor, 0);
    Main.panel._leftBox.child_set(appsMenuButton.actor, { y_fill : true } );
    Main.panel._menus.addMenu(appsMenuButton.menu);      
}
