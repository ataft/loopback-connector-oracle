// Copyright IBM Corp. 2015,2018. All Rights Reserved.
// Node module: loopback-connector-oracle
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

/* global getDataSource */
require('./init/init.js');
require('should');

const Transaction = require('loopback-connector').Transaction;

let db, Post;

describe('transactions', function() {
  before(function(done) {
    db = getDataSource();
    Post = db.define('PostTX', {
      title: {type: String, length: 255, index: true},
      content: {type: String},
    });
    db.automigrate('PostTX', done);
  });

  let currentTx;
  // Return an async function to start a transaction and create a post
  function createPostInTx(post) {
    return function(done) {
      Transaction.begin(db.connector, Transaction.READ_COMMITTED,
        function(err, tx) {
          if (err) return done(err);
          currentTx = tx;
          Post.create(post, {transaction: tx},
            function(err, p) {
              if (err) {
                done(err);
              } else {
                done();
              }
            });
        });
    };
  }

  // Return an async function to find matching posts and assert number of
  // records to equal to the count
  function expectToFindPosts(where, count, inTx) {
    return function(done) {
      const options = {};
      if (inTx) {
        options.transaction = currentTx;
      }
      Post.find({where: where}, options,
        function(err, posts) {
          if (err) return done(err);
          posts.length.should.be.eql(count);
          done();
        });
    };
  }

  describe('commit', function() {
    const post = {title: 't1', content: 'c1'};
    before(createPostInTx(post));

    it('should not see the uncommitted insert', expectToFindPosts(post, 0));

    it('should see the uncommitted insert from the same transaction',
      expectToFindPosts(post, 1, true));

    it('should commit a transaction', function(done) {
      currentTx.commit(done);
    });

    it('should see the committed insert', expectToFindPosts(post, 1));
  });

  describe('rollback', function() {
    const post = {title: 't2', content: 'c2'};
    before(createPostInTx(post));

    it('should not see the uncommitted insert', expectToFindPosts(post, 0));

    it('should see the uncommitted insert from the same transaction',
      expectToFindPosts(post, 1, true));

    it('should rollback a transaction', function(done) {
      currentTx.rollback(done);
    });

    it('should not see the rolledback insert', expectToFindPosts(post, 0));
  });
});

