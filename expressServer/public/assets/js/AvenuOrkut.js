var UserModel = Backbone.Model.extend({
	url: '/users/me',
	defaults: {
		"name": "Default Name",
		"email": "default@email.com"
	},
	parse: function ( response ) {
		response.md5 = md5( response.email );
		response.id = response._id;
		delete response._id;
		return response;
	}
});

var FriendshipModel = Backbone.Model.extend({
	urlRoot: '/friendships',
	sync: function(method, model, options) {
		options || (options = {});
		switch(method){
			case 'create':
			options.url = this.urlRoot + '/' + model.attributes.friendID;
			break;
		}
		return Backbone.sync(method, model, options);
	}
});

var FriendsList = Backbone.Collection.extend({
	url: '/friendships/me'
});

var FriendsRequests = Backbone.Collection.extend({
	url: '/friendships'
});

var UsersList = Backbone.Collection.extend({
	url: '/users',
	model: UserModel,
	initialize: function( options ) {
		this.exclude = options.exclude;
		this.include = options.include;
	},
	parse: function( response ) {
		var selected = [],
			that = this;
		if( this.exclude ) {
			$.each( response, function(index, model) {
				if( $.inArray( model._id, that.exclude ) == -1 ) {       
	       			selected.push( model );       
	       		}
	   		});
		}
		else if( this.include ) {
			$.each( response, function(index, model) {
				if( $.inArray( model._id, that.include ) != -1 ) {       
	       			selected.push( model );       
	       		}
	   		});
		}
		else {
			selected = response;
		}
   		return selected;
	}
});

var UserTemplate = _.template('<div class="col-sm-3 user-div" id="user_<%= id %>"">' + 
	'<img class="img-responsive" src="http://www.gravatar.com/avatar/<%= md5 %>.jpg?s=100">' + 
	'<%= name %><br><a class="addFriend" href="#"> + amigo </a></span></div>');

var FriendRequestTemplate = _.template('<div class="col-sm-3 user-div" id="user_<%= id %>"">' + 
	'<img class="img-responsive" src="http://www.gravatar.com/avatar/<%= md5 %>.jpg?s=100">' + 
	'<%= name %><br><a class="acceptFriend" href="#"> aceitar pedido </a></span></div>');

var SimpleUserTemplate = _.template('<div class="col-sm-4 user-div" id="user_<%= id %>"">' + 
	'<img class="img-responsive" src="http://www.gravatar.com/avatar/<%= md5 %>.jpg?s=100">' + 
	'<%= name %></div>');


var CollectionView = Backbone.View.extend({
	initialize: function(options) {
		this.template = options.template;
		this.listenTo(this.collection, "sync", this.render);
		this.collection.fetch();
	},
	render: function() {
		var self = this;
		this.$el.html('');
		this.collection.forEach(function(user, index){
			if( index < 8 ) {
				self.$el.append( self.template( user.attributes ) );
			}
		});
	}
});

var UsersCollectionView = CollectionView.extend({
	events: {
		'click .inviteFriend': 'inviteFriend',
		'click .acceptFriend': 'acceptFriend'
	},
	inviteFriend: function (event) {
		console.log('invite friend', event);
		var index = this.$el.find('a.addFriend').index(event.currentTarget);
		var user = this.collection.at(index);
		var friend = new FriendshipModel( { friendID: user.get('id') } );
		friend.save();
	},
	acceptFriend: function(event){
		console.log('accept friend', event);
		var index = this.$el.find('a.addFriend').index(event.currentTarget);
		var user = this.collection.at(index);
		var friend = new FriendshipModel( { id: user.get('id') } );
		friend.save();
	}
});

var ProfileView = Backbone.View.extend({
	initialize: function(){
		if( !this.model.get('id') ) {
			this.model.fetch();
		}
	},
	loadChildrenViews: function() {
		var friendships = new FriendsRequests();
		var myFriendships = new FriendsList();
		
		var myID = this.model.get('id');

		this.listenTo( friendships, 'sync', function() {

			var requestedByMe = _.chain(friendships.models).map(function(req) {
				if (req.attributes._id.userRequester === myID && req.attributes.status === 0 ) return req.attributes._id.userRequested;
			}).compact().value();

			var requestedByOthers = _.chain(friendships.models).map(function(req) {
				if (req.attributes._id.userRequested === myID && req.attributes.status === 0 ) return req.attributes._id.userRequester;
			}).compact().value();

			var accepted = _.chain(friendships.models).map(function(req) {
				if ( req.attributes._id.userRequested === myID && req.attributes.status === 1 ) return req.attributes._id.userRequester;
				if ( req.attributes._id.userRequester === myID && req.attributes.status === 1 ) return req.attributes._id.userRequested;
			}).compact().value();		

			var toExclude = requestedByMe.concat(requestedByOthers).concat(accepted);
			toExclude.push( myID );

			var allUsers = new UsersList({exclude: toExclude});
			var allUsersView = new UsersCollectionView({ collection: allUsers, el: this.$el.find('#allUsers'), template: UserTemplate });

			var friendRequests = new UsersList({include: requestedByOthers});
			var friendRequestsView = new UsersCollectionView({ collection: friendRequests, el: this.$el.find('#friendRequests'), template: FriendRequestTemplate });

			var friendRequested = new UsersList({include: requestedByMe});
			var friendRequestedView = new UsersCollectionView({ collection: friendRequested, el: this.$el.find('#myRequests'), template: SimpleUserTemplate });

		});

		this.listenTo( myFriendships, 'sync', function() {

			var acceptedFriends = _.chain(myFriendships.models).map(function(req) {
				if ( req.attributes._id.userRequester === myID && req.attributes.status === 1 ) return req.attributes._id.userRequested;
				if ( req.attributes._id.userRequested === myID && req.attributes.status === 1 ) return req.attributes._id.userRequester;
			}).compact().value();

			var myFriends = new UsersList({include: acceptedFriends });
			var myFriendsView = new UsersCollectionView({ collection: myFriends, el: this.$el.find('#myFriends'), template: SimpleUserTemplate });
		});

		friendships.fetch();
		myFriendships.fetch();
	},

	render: function() {
		// Compile the template using underscore
      	this.$el.html( $("#profileViewTemplate").html() );
		this.$el.find('#myProfile .panel-thumbnail').html('<img id="profilePicture" src="http://www.gravatar.com/avatar/' + this.model.get('md5') + '.jpg?s=200" class="img-responsive">')
		this.$el.find('#myProfile .lead').text( this.model.get('name') );

		this.loadChildrenViews();

		return this;
	},
	events: {
		'click #profilePicture': function( event ) {
			console.log(this, event, 'clicked profile picture');
		}
	}
});

var EditProfileView = Backbone.View.extend({
	render: function() {
		// Compile the template using underscore
      	this.$el.html( $("#profileEditTemplate").html() );		
		return this;
	}
});


var AvenuOrkut = new (Backbone.Router.extend({
	routes: {
		"edit": "editProfile",
		"*splat": "viewProfile"
	},
	start: function(){
		Backbone.history.start();
		console.log('AvenuOrkut started.');
	},
	viewProfile: function() {
		var that = this;
		var myProfileView;
		
		if( !this.myProfile ) {
			this.myProfile = new UserModel();
			myProfileView = new ProfileView( { model: this.myProfile } );
			this.listenTo( this.myProfile, 'sync', function(){ that.setView( myProfileView ) } );
		}
		else {
			myProfileView = new ProfileView( { model: this.myProfile } );
			this.setView( myProfileView );
		}		
	},
	editProfile: function() {		
		var editProfileView = new EditProfileView( { model: this.myProfile } );
		this.setView( editProfileView );			
	},
	setView: function( view ){
		var that = this;
		if( this.currentView ){
			this.currentView.$el.fadeOut( function() {
				that.currentView.remove();
				that.displayCurrentView( view );
			});
		} else {
			this.displayCurrentView( view );
		}
	},
	displayCurrentView: function( view ){
		var that = this;
		if( view ) {
			this.currentView = view;
			this.currentView.render().$el.hide();
			this.currentView.$el.appendTo('#mainViewContainer');
			that.currentView.$el.fadeIn();
		}
	}
}));

AvenuOrkut.start();