import { expect } from "chai";
import sinon from "sinon";
import { use } from "chai";
import sinonChai from "sinon-chai";
import { BodyTemplateManager } from "../../../src/utils/BodyTemplates";

use(sinonChai);

// Global constants
global.WORK = "work" as any;
global.CARRY = "carry" as any;
global.MOVE = "move" as any;
global.BODYPART_COST = {
  work: 100,
  carry: 50,
  move: 50
} as any;

describe("BodyTemplateManager", () => {
  describe("selectTemplate", () => {
    it("should select minimal worker for low energy", () => {
      const body = BodyTemplateManager.selectTemplate(200, { harvest: 1 });
      
      expect(body).to.deep.equal([WORK, CARRY, MOVE]);
    });

    it("should select energy specialist for high energy harvest need", () => {
      const body = BodyTemplateManager.selectTemplate(600, { harvest: 1 });
      
      // Should get the energy specialist template
      expect(body).to.include(WORK);
      expect(body.filter(p => p === WORK).length).to.equal(5);
    });

    it("should select transport specialist for haul need", () => {
      const body = BodyTemplateManager.selectTemplate(400, { haul: 1 });
      
      // Should prioritize carry parts
      expect(body.filter(p => p === CARRY).length).to.be.greaterThan(1);
      expect(body.filter(p => p === WORK).length).to.equal(0);
    });

    it("should return empty array for insufficient energy", () => {
      const body = BodyTemplateManager.selectTemplate(100, { harvest: 1 });
      
      expect(body).to.deep.equal([]);
    });

    it("should balance multiple needs", () => {
      const body = BodyTemplateManager.selectTemplate(400, { 
        harvest: 0.5, 
        haul: 0.5 
      });
      
      // Should get a balanced template
      expect(body).to.include(WORK);
      expect(body).to.include(CARRY);
      expect(body).to.include(MOVE);
    });
  });

  describe("scaleTemplate", () => {
    it("should scale template up with more energy", () => {
      const baseTemplate = [WORK, CARRY, MOVE];
      const scaled = BodyTemplateManager.scaleTemplate(baseTemplate, 400);
      
      expect(scaled.length).to.be.greaterThan(baseTemplate.length);
      expect(scaled).to.include.members(baseTemplate);
    });

    it("should scale template down with less energy", () => {
      const baseTemplate = [WORK, WORK, CARRY, CARRY, MOVE, MOVE];
      const scaled = BodyTemplateManager.scaleTemplate(baseTemplate, 200);
      
      expect(scaled.length).to.be.lessThan(baseTemplate.length);
    });

    it("should not exceed max parts limit", () => {
      const baseTemplate = [WORK, CARRY, MOVE];
      const scaled = BodyTemplateManager.scaleTemplate(baseTemplate, 10000, 50);
      
      expect(scaled.length).to.be.at.most(50);
    });
  });

  describe("generateCustomBody", () => {
    it("should create body with minimum requirements", () => {
      const body = BodyTemplateManager.generateCustomBody(
        { minWork: 2, minCarry: 1, minMove: 1 },
        500
      );
      
      expect(body.filter(p => p === WORK).length).to.be.at.least(2);
      expect(body.filter(p => p === CARRY).length).to.be.at.least(1);
      expect(body.filter(p => p === MOVE).length).to.be.at.least(1);
    });

    it("should prefer work parts when specified", () => {
      const body = BodyTemplateManager.generateCustomBody(
        { minWork: 1, preferWork: true },
        500
      );
      
      const workParts = body.filter(p => p === WORK).length;
      const carryParts = body.filter(p => p === CARRY).length;
      
      expect(workParts).to.be.greaterThan(carryParts);
    });

    it("should ensure mobility with fast move option", () => {
      const body = BodyTemplateManager.generateCustomBody(
        { minWork: 2, fastMove: true },
        400
      );
      
      const nonMoveParts = body.filter(p => p !== MOVE).length;
      const moveParts = body.filter(p => p === MOVE).length;
      
      // With fastMove, should have 1:1 ratio
      expect(moveParts).to.be.at.least(nonMoveParts);
    });

    it("should not exceed body part limit", () => {
      const body = BodyTemplateManager.generateCustomBody(
        { minWork: 10, preferWork: true },
        10000
      );
      
      expect(body.length).to.be.at.most(50);
    });
  });

  describe("getEmergencyWorker", () => {
    it("should create minimal worker for emergency", () => {
      const body = BodyTemplateManager.getEmergencyWorker(200);
      
      expect(body).to.deep.equal([WORK, CARRY, MOVE]);
    });

    it("should create carry+move for very low energy", () => {
      const body = BodyTemplateManager.getEmergencyWorker(100);
      
      expect(body).to.deep.equal([CARRY, MOVE]);
    });

    it("should return empty for insufficient energy", () => {
      const body = BodyTemplateManager.getEmergencyWorker(50);
      
      expect(body).to.deep.equal([]);
    });
  });
});