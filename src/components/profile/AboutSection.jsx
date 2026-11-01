/**
 * About — what the shop is. (Moved here from the old stand-alone About page.)
 */
export default function AboutSection() {
  return (
    <section className="profile-section" aria-labelledby="profile-about-title">
      <h2 id="profile-about-title" className="section-title">About</h2>
      <h3 className="display profile-section__lead">A one-room armory.</h3>
      <p className="lede">
        Bore &amp; Barrel sells a short, honest list of firearms. Each piece is priced
        from the bench — no markup theatre, no filler.
      </p>
    </section>
  )
}
