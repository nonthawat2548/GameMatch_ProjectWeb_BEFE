import { Link } from 'react-router-dom';

export default function About() {
  return (
    <article className="about-page">
      <h1>เกี่ยวกับ GameMatch</h1>
      <p className="muted">เว็บช่วยเลือกเกมจากแนวเกม รูปแบบการเล่น และสไตล์ที่คุณชอบ</p>
      <section className="panel">
        <h2>เริ่มใช้งาน</h2>
        <ol className="about-steps">
          <li>ดูเกมในคลังและเปิดรายละเอียดได้โดยไม่ต้องสมัครสมาชิก</li>
          <li>เลือกความชอบ 3 ข้อ เพื่อดูเกมที่ตรงกับตัวเลือก พร้อมเหตุผลประกอบ</li>
          <li>เข้าสู่ระบบเพื่อเก็บเกมโปรดและบันทึกความชอบไว้ใช้ครั้งต่อไป</li>
        </ol>
        <Link className="button" to="/match">
          เริ่มเลือกเกม
        </Link>
      </section>
      <section className="about-section">
        <h2>วิธีคิดคะแนน</h2>
        <p>
          เทียบความชอบกับข้อมูลเกม: แนวเกม 45 คะแนน รูปแบบการเล่น 25 คะแนน และสไตล์ 30 คะแนน
          แล้วแสดง 5 อันดับที่ได้คะแนนสูงสุด
        </p>
        <p className="muted">
          ข้อมูลที่ยังยืนยันไม่ได้จะไม่ได้คะแนนในส่วนนั้น คะแนนนี้ไม่ใช่การรับประกันว่าจะชอบเกม
          และไม่ได้ใช้ AI ตัดสินความชอบ
        </p>
      </section>
      <section className="about-section">
        <h2>แหล่งข้อมูล</h2>
        <p>
          คลังยอดนิยมคัดจาก{' '}
          <a
            className="inline-link"
            href="https://store.steampowered.com/charts/mostplayed"
            target="_blank"
            rel="noreferrer"
          >
            Steam Most Played
          </a>{' '}
          และ{' '}
          <a
            className="inline-link"
            href="https://store.steampowered.com/search/?filter=topsellers&category1=998&cc=th"
            target="_blank"
            rel="noreferrer"
          >
            Top Sellers ในประเทศไทย
          </a>{' '}
          เลือกเฉพาะเกมที่ข้อมูลครบ ไม่ใช่อันดับรวมแบบสดหรือการรับประกันความชอบ
        </p>
        <p>
          เกมออกใหม่ ภาพ วันที่วางจำหน่าย และแท็กจาก{' '}
          <a
            className="inline-link"
            href="https://store.steampowered.com/explore/new/"
            target="_blank"
            rel="noreferrer"
          >
            Steam New Releases
          </a>{' '}
          อัปเดตโดยผู้ดูแล และรองรับข้อมูลจาก{' '}
          <a className="inline-link" href="https://rawg.io" target="_blank" rel="noreferrer">
            RAWG
          </a>{' '}
          ส่วนคำอธิบายเพิ่มเติมจัดการโดยผู้ดูแล GameMatch
        </p>
        <p className="muted">
          คลังแสดงชุดยอดนิยมก่อน และเลือกเรียงตามวันที่วางจำหน่ายที่แหล่งข้อมูลระบุได้
          ไม่ครอบคลุมเกมทั้งหมดหรืออัปเดตอัตโนมัติ GameMatch เป็นโปรเจกต์อิสระ
          ข้อมูลและภาพเป็นของเจ้าของสิทธิ์แต่ละเกม
        </p>
        <p className="muted">
          รายการที่ขึ้นต้นด้วย Demo: เป็นเกมสมมติสำหรับทดสอบระบบ ไม่ใช่ข้อมูลเกมจริง
          เราไม่แสดงราคาหรือเวลาเล่นที่ยังไม่ได้ตรวจสอบ
        </p>
      </section>
    </article>
  );
}
