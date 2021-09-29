// Chai Setup
const chai = require("chai");
const chaiHttp = require("chai-http");
const expect = chai.expect;
chai.use(chaiHttp);

const app = require("../index");

suite("Basic Server Tests", () => {
  test("1)  Loaded Test", () => {
    chai
      .request(app)
      .get("/")
      .end((err, res) => {
        expect(res.text.match(/<title>P2P Video Chat Application<\/title>/)).to
          .not.be.null;
        expect(
          res.text.match(/<i class="far fa-comment fa-flip-horizontal"><\/i>/)
        ).to.be.null;
      });
  });

  test("2)  Joined Room Test", () => {
    chai
      .request(app)
      .get("/Room-1")
      .end((err, res) => {
        expect(
          res.text.match(/<i class="far fa-comment fa-flip-horizontal"><\/i>/)
        ).to.not.be.null;
      });
  });
});
