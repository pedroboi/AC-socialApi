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


var FrienshipRequests = Backbone.Model.extend({
	urlRoot: '/requested',
});

var ProfileView = Backbone.View.extend({
	el: '#myProfile',
	render: function() {
		this.$el.html( '<img id="profilePicture" src="http://www.gravatar.com/avatar/' + this.model.get('md5') + '.jpg">' + this.model.get('name') );
		return this;
	},
	update: function() {
		var self = this;    
		this.model.fetch().done( function() {
			self.render();
		});
	},
	events: {
		'click #profilePicture': function( event ) {
			console.log(this, event, 'clicked profile picture');
		}
	}
});

var FriendView = Backbone.View.extend({
	render: function() {
		this.$el.html( '<img id="profilePicture" src="http://www.gravatar.com/avatar/' + this.model.get('md5') + '.jpg?s=40"> Friend Name: ' + this.model.get('name') );
		return this;
	}
});

var UsersList = Backbone.Collection.extend({
	url: '/users',
	model: UserModel
});

var FriendsList = Backbone.Collection.extend({
	url: '/friendships/me',
	model: FriendshipModel
});

var UserTemplate = _.template('<span id="user_<%= id %>"><%= name %> <a class="addFriend" href="#"> add as friend </a></span>');

var CollectionView = Backbone.View.extend({
	initialize: function(options) {
		this.template = options.template;
		this.label = options.label;
		this.listenTo(this.collection, "sync", this.render);	
		this.collection.fetch();
	},
	render: function() {
		var self = this;		
		this.$el.html('');
		this.collection.forEach(function(user){
 			self.$el.append( self.template( user.attributes ) );
		});		
		console.log( this.label , this.collection.models );
	}
});

var UsersCollectionView = CollectionView.extend({
	events: {
		'click .addFriend': function (event) {
			console.log('add friend', event);

			var index = this.$el.find('a.addFriend').index(event.currentTarget);
			var user = this.collection.at(index);
			var friend = new FriendshipModel( { friendID: user.get('id') } );
			
			friend.save();
		}
	}
});

var FriendshipsCollectionView = CollectionView.extend({	
	events: {
		'click .addFriend': function (event) {
			console.log('add friend', event);
			var index = this.$el.find('a.addFriend').index(event.currentTarget);
			console.log('index', index);
			var friend = new FriendModel( this.collection.at(index).attributes );
			console.log('friend', friend.attributes );
			friend.unset('id');
			friend.save();
		}
	}
});


var myProfile = new UserModel();
var myFriends = new FriendsList();
var Users = new UsersList();

var myProfileView = new ProfileView( { model: myProfile } );

var allUsersCollection = new UsersCollectionView({ collection: Users, el: '#allUsers', label: 'Users List', template: UserTemplate });
var myFriendsCollection = new FriendshipsCollectionView({ collection: myFriends, el: '#myFriends', label: 'Friends List' });

myProfileView.update();