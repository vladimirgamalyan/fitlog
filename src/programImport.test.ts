import { describe, expect, it } from 'vitest'
import { parseProgramsFile } from './programImport'
import bundled from './programs.json'

function valid(): Record<string, unknown> {
  return {
    weightStep: 2.5,
    programs: [
      {
        id: 'a',
        name: 'Workout A',
        day: 'Tuesday',
        exercises: [
          {
            id: 'leg-press',
            name: 'Leg Press',
            sets: 3,
            reps: '10-12',
            guide: { images: ['data:image/jpeg;base64,xxx'], steps: ['Sit down.'] },
          },
        ],
      },
    ],
  }
}

describe('parseProgramsFile', () => {
  it('accepts a valid file', () => {
    const file = parseProgramsFile(JSON.stringify(valid()))
    expect(file.weightStep).toBe(2.5)
    expect(file.programs[0]!.exercises[0]!.guide!.images![0]).toMatch(/^data:/)
  })

  it('accepts the bundled demo file', () => {
    expect(() => parseProgramsFile(JSON.stringify(bundled))).not.toThrow()
  })

  it('rejects text that is not JSON', () => {
    expect(() => parseProgramsFile('{oops')).toThrow('Not a JSON file')
  })

  it('rejects a JSON value that is not an object', () => {
    expect(() => parseProgramsFile('[1,2]')).toThrow('Expected a JSON object')
  })

  it('rejects a missing or non-positive weightStep', () => {
    const file = valid()
    delete file.weightStep
    expect(() => parseProgramsFile(JSON.stringify(file))).toThrow('weightStep')
    file.weightStep = 0
    expect(() => parseProgramsFile(JSON.stringify(file))).toThrow('weightStep')
  })

  it('rejects an empty programs array', () => {
    expect(() => parseProgramsFile(JSON.stringify({ weightStep: 2.5, programs: [] }))).toThrow(
      'programs',
    )
  })

  it('rejects duplicate program ids', () => {
    const file = valid()
    const programs = file.programs as unknown[]
    programs.push(structuredClone(programs[0]))
    expect(() => parseProgramsFile(JSON.stringify(file))).toThrow('unique')
  })

  it('rejects an exercise without reps', () => {
    const file = valid() as { programs: { exercises: { reps?: string }[] }[] }
    delete file.programs[0]!.exercises[0]!.reps
    expect(() => parseProgramsFile(JSON.stringify(file))).toThrow('reps')
  })

  it('rejects a fractional set count', () => {
    const file = valid() as { programs: { exercises: { sets?: number }[] }[] }
    file.programs[0]!.exercises[0]!.sets = 2.5
    expect(() => parseProgramsFile(JSON.stringify(file))).toThrow('sets')
  })

  it('rejects a guide without steps', () => {
    const file = valid() as { programs: { exercises: { guide?: object }[] }[] }
    file.programs[0]!.exercises[0]!.guide = { images: [] }
    expect(() => parseProgramsFile(JSON.stringify(file))).toThrow('steps')
  })

  it('drops unknown fields instead of keeping them', () => {
    const file = valid()
    file.extra = 'junk'
    const parsed = parseProgramsFile(JSON.stringify(file))
    expect('extra' in parsed).toBe(false)
  })
})
