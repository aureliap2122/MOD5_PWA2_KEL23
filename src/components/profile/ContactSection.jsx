import { MapPin, Clock, Phone } from 'lucide-react'

/**
 * Contact — where to find the shop. (Moved here from the old stand-alone
 * Contact page.)
 */
export default function ContactSection() {
  return (
    <section className="profile-section" aria-labelledby="profile-contact-title">
      <h2 id="profile-contact-title" className="section-title">Contact</h2>
      <h3 className="display profile-section__lead">Come by the shop.</h3>
      <ul className="contact-list">
        <li>
          <MapPin size={18} aria-hidden="true" />
          <span>123 Range Road</span>
        </li>
        <li>
          <Clock size={18} aria-hidden="true" />
          <span>Open Tuesday to Saturday, 10 to 6</span>
        </li>
        <li>
          <Phone size={18} aria-hidden="true" />
          <a href="tel:+55501000100">(555) 010-0100</a>
        </li>
      </ul>
    </section>
  )
}
